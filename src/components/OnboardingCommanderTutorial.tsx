import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  Gamepad2, 
  Gift, 
  Grid, 
  Trophy, 
  Shield, 
  Zap,
  Target,
  Sparkles,
  Compass
} from 'lucide-react';
import { User } from '../types';

// In-project commander character avatars
import womanCommanderAvatar from '../assets/images/avatar/woman/Commander_giving_orders_2K_202608210108.jpeg';
import maleCommanderAvatar from '../assets/images/avatar/male/Commander_in_tactical_uniform_ready_202608210056.jpeg';

interface OnboardingCommanderTutorialProps {
  currentUser: User | null;
  onComplete: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function OnboardingCommanderTutorial({
  currentUser,
  onComplete,
  onNavigateTab
}: OnboardingCommanderTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isGirls = currentUser?.gender === 'دختر' || localStorage.getItem('hisstory_theme_mode') === 'girls';

  // Commander Character Profiles
  const commander = isGirls
    ? {
        name: 'فرمانده نگار (ستاد نور)',
        title: 'راهنمای ارشد عملیات دختران',
        avatar: womanCommanderAvatar,
        badgeColor: 'from-pink-500 to-rose-600',
        borderColor: 'border-pink-500/50',
        glowColor: 'shadow-[0_0_30px_rgba(244,63,94,0.4)]',
        accentText: 'text-pink-400',
        accentBg: 'bg-pink-500/20',
        neonBtn: 'girls-button-neon'
      }
    : {
        name: 'فرمانده کاوه (ستاد فاتحان)',
        title: 'راهنمای ارشد عملیات پسران',
        avatar: maleCommanderAvatar,
        badgeColor: 'from-cyan-500 to-blue-600',
        borderColor: 'border-cyan-500/50',
        glowColor: 'shadow-[0_0_30px_rgba(6,182,212,0.4)]',
        accentText: 'text-cyan-400',
        accentBg: 'bg-cyan-500/20',
        neonBtn: 'boys-button-tactical'
      };

  const steps = [
    {
      targetTab: 'Journey',
      icon: Compass,
      targetLabel: 'مرکز فرماندهی و آمادگی عملیات',
      title: `سلام رزمنده ${currentUser?.first_name || 'عزیز'}! خوش اومدی`,
      text: 'من راهنمای تاکتیکی تو در اتاق جنگ هستم. بیا با هم امکانات اصلی و مسیر مسابقه رو در چند ثانیه مرور کنیم.',
    },
    {
      targetTab: 'Journey',
      icon: Gamepad2,
      targetLabel: 'نقشه مراحل هفت‌گانه (Journey Map)',
      title: '۱. نقشه مراحل بازی',
      text: 'اینجا نقشه اصلی بازیه؛ ۷ مرحله هیجان‌انگیز داری. هر مرحله شامل چالش‌های امتیازی، سوالات هوشمند و ارسال آثار است.',
    },
    {
      targetTab: 'Rewards',
      icon: Gift,
      targetLabel: 'ویترین جوایز و کریستال‌ها (Rewards)',
      title: '۲. جوایز و امتیازات',
      text: 'در این بخش هدایا و جوایز ارزنده‌ای که توسط مدیر سامانه تعیین شده قرار داره. با کسب امتیاز و کریستال قفل جوایز رو باز کن.',
    },
    {
      targetTab: 'Vitrin',
      icon: Grid,
      targetLabel: 'ویترین و اکسپلور دست‌سازه‌ها (Vitrin)',
      title: '۳. ویترین و آثار دانش‌آموزی',
      text: 'در این بخش ویدیوها و دست‌سازه‌های ارسالی بچه‌های سراسر کشور رو می‌بینی و می‌تونی لایک کنی و ستاره بدی.',
    },
    {
      targetTab: 'Leaderboard',
      icon: Trophy,
      targetLabel: 'سکوی برترین‌های کشور (Leaderboard)',
      title: '۴. جدول رده‌بندی و قهرمانان',
      text: 'روی سکوی قهرمانی، تیم‌های برتر ایران می‌درخشند. تلاش کن با کسب بیشترین امتیاز به صدر جدول ملحق بشی.',
    }
  ];

  const currentStepData = steps[currentStep];

  // Auto switch tab in background when step changes
  useEffect(() => {
    if (onNavigateTab && currentStepData.targetTab) {
      onNavigateTab(currentStepData.targetTab);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end p-3 sm:p-6 dir-rtl font-sans select-none">
      
      {/* Light subtle backdrop overlay - allows background page to be visible */}
      <div 
        onClick={onComplete}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300"
      />

      {/* Floating Tactical Spotlight Focus Indicator (Pointers towards top/center) */}
      <motion.div 
        key={`beacon-${currentStep}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="max-w-xl mx-auto w-full mb-2 flex items-center justify-center pointer-events-auto relative z-20"
      >
        <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black border shadow-lg backdrop-blur-md ${
          isGirls 
            ? 'bg-pink-950/80 text-pink-300 border-pink-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
            : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
        }`}>
          <Target size={13} className="animate-spin text-amber-400" style={{ animationDuration: '4s' }} />
          <span>راهنما: {currentStepData.targetLabel}</span>
        </div>
      </motion.div>

      {/* Floating Tactical Commander HUD Box (Bottom Floating Coach Card) */}
      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.96 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className={`w-full max-w-2xl mx-auto bg-[#070d1e]/95 border-2 ${commander.borderColor} rounded-3xl p-4 sm:p-5 shadow-2xl relative ${commander.glowColor} pointer-events-auto backdrop-blur-xl z-20 mb-2 sm:mb-4`}
      >
        {/* Subtle Tech Hologram Lines */}
        <div className="absolute inset-0 radar-grid opacity-20 pointer-events-none rounded-3xl" />

        {/* Dismiss / Close Tutorial */}
        <button
          onClick={onComplete}
          className="absolute top-3 left-3 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition z-30 border border-slate-700/80 text-xs flex items-center gap-1 cursor-pointer"
          title="پایان راهنما"
        >
          <span className="text-[10px] hidden sm:inline">رد کردن</span>
          <X size={13} />
        </button>

        {/* Content Row: Commander Avatar + Interactive Speech Balloon */}
        <div className="flex flex-row items-center sm:items-start gap-3.5 relative z-10">
          
          {/* Commander Character Avatar with Tactical Rank Badge */}
          <div className="relative shrink-0 flex flex-col items-center">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 bg-gradient-to-tr ${commander.badgeColor} shadow-xl border border-white/20 relative group overflow-hidden`}>
              <img 
                src={commander.avatar} 
                alt={commander.name}
                className="w-full h-full object-cover rounded-xl object-top"
              />
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full shadow-lg">
                <Shield size={12} className="fill-slate-950" />
              </div>
            </div>
            
            <div className="text-center mt-1 hidden sm:block">
              <span className="text-[10px] font-black text-white block truncate max-w-[90px]">{commander.name}</span>
            </div>
          </div>

          {/* Speech & Navigation Body */}
          <div className="flex-1 min-w-0 space-y-2 text-right">
            
            {/* Header: Title + Progress Bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`p-1 rounded-lg ${commander.accentBg} ${commander.accentText} shrink-0`}>
                  <Icon size={15} />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-white truncate">
                  {currentStepData.title}
                </h3>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-1 shrink-0 pl-7 sm:pl-0">
                {steps.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep 
                        ? isGirls ? 'bg-pink-500 w-3.5' : 'bg-cyan-400 w-3.5'
                        : idx < currentStep 
                          ? 'bg-slate-500 w-1.5' 
                          : 'bg-slate-800 w-1.5'
                    }`} 
                  />
                ))}
              </div>
            </div>

            {/* Speech Text Content */}
            <div className="bg-[#030611]/80 rounded-2xl p-2.5 sm:p-3 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-medium">
              {currentStepData.text}
            </div>

            {/* Controls Bar: Prev & Next Buttons */}
            <div className="flex items-center justify-between pt-1 gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`px-3 py-1 rounded-xl text-xs font-bold border border-slate-800 text-slate-400 transition flex items-center gap-1 ${
                  currentStep === 0 ? 'opacity-25 cursor-not-allowed' : 'hover:bg-slate-800 hover:text-white cursor-pointer'
                }`}
              >
                <ArrowRight size={13} />
                <span>قبلی</span>
              </button>

              <button
                onClick={handleNext}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg transform active:scale-95 cursor-pointer text-white ${
                  isGirls
                    ? 'girls-button-neon border border-pink-400/50 shadow-pink-900/40'
                    : 'boys-button-tactical border border-blue-400/50 shadow-blue-900/40'
                }`}
              >
                <span>{currentStep === steps.length - 1 ? 'شروع مأموریت' : 'مرحله بعد'}</span>
                {currentStep === steps.length - 1 ? <Check size={14} /> : <ArrowLeft size={14} />}
              </button>
            </div>

          </div>

        </div>

      </motion.div>

    </div>
  );
}
