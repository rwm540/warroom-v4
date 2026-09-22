import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
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
  Volume2
} from 'lucide-react';
import { User, Gender } from '../types';

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

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
    };
  }, []);

  const isGirls = currentUser?.gender === 'دختر' || localStorage.getItem('hisstory_theme_mode') === 'girls';

  // Two Commander Character Avatars
  const commander = isGirls
    ? {
        name: 'فرمانده نگار (ستاد نور)',
        title: 'راهنمای ارشد عملیات دختران',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        badgeColor: 'from-pink-500 to-rose-600',
        borderColor: 'border-pink-500',
        glowColor: 'shadow-[0_0_30px_rgba(244,63,94,0.6)]'
      }
    : {
        name: 'فرمانده کاوه (ستاد فاتحان)',
        title: 'راهنمای ارشد عملیات پسران',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        badgeColor: 'from-cyan-500 to-blue-600',
        borderColor: 'border-cyan-400',
        glowColor: 'shadow-[0_0_30px_rgba(6,182,212,0.6)]'
      };

  const steps = [
    {
      targetTab: 'Journey',
      icon: Gamepad2,
      title: `سلام رزمنده ${currentUser?.first_name || 'عزیز'}! به قرارگاه اتاق جنگ خوش اومدی`,
      text: 'من فرمانده و راهنمای تاکتیکی تو هستم. وظیفه من اینه که تو رو برای ورود به بزرگ‌ترین میدان ماجراجویی و چالش‌های هفت‌گانه کشور آماده کنم. آماده‌ای؟',
      highlightArea: 'مرکز فرماندهی'
    },
    {
      targetTab: 'Journey',
      icon: Gamepad2,
      title: '۱. نقشه مراحل بازی (Game Map)',
      text: 'اینجا نقشه اصلی بازیه! مثل هفت‌خوان، ۷ مرحله هیجان‌انگیز داری. مرحله اول با نور نئون روشن و فعاله و بقیه مراحل به مرور با کسب امتیاز و ارسال ماموریت‌ها باز میشن.',
      highlightArea: 'نقشه عملیاتی و مرحله فعال'
    },
    {
      targetTab: 'Rewards',
      icon: Gift,
      title: '۲. جوایز و امتیازات (Prizes & Points)',
      text: 'توی بخش جوایز، هدایا و جوایز ارزنده‌ای که توسط مدیر سامانه تعیین شده منتظرته! با انجام مأموریت‌ها و مراحل، کریستال و امتیاز جمع کن و قفل جایزه‌ت رو باز کن.',
      highlightArea: 'ویترین جوایز و کریستال‌ها'
    },
    {
      targetTab: 'Vitrin',
      icon: Grid,
      title: '۳. ویترین افتخارات (Vitrin / Explore)',
      text: 'اینجا مثل اکسپلور اینستاگرام، ویدیوها، دست‌سازه‌ها و خلاقیت‌های بچه‌های سراسر ایران رو می‌بینی. می‌تونی با دبل‌تپ (دوبار کلیک) لایک کنی یا بهشون ۱ تا ۵ ستاره بدی!',
      highlightArea: 'اکسپلور اینستاگرامی و امتیازدهی'
    },
    {
      targetTab: 'Leaderboard',
      icon: Trophy,
      title: '۴. جدول رده‌بندی و سکوی ۵ تیم برتر',
      text: 'روی سکوی قهرمانی، ۵ تیم برتر ایران می‌درخشند! تلاش کن با سرگروه و هم‌تیمی‌هات به جمع برترین‌های تالار افتخارات ملحق بشی.',
      highlightArea: 'سکوی جام قهرمانی'
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (onNavigateTab && steps[nextStep].targetTab) {
        onNavigateTab(steps[nextStep].targetTab);
      }
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (onNavigateTab && steps[prevStep].targetTab) {
        onNavigateTab(steps[prevStep].targetTab);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto bg-black/85 backdrop-blur-sm flex flex-col justify-center items-center p-3 sm:p-6 dir-rtl font-sans select-none animate-in fade-in duration-300 overflow-y-auto">
      
      {/* Clash of Clans Style Commander Dialog Box */}
      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25 }}
        className={`w-full max-w-xl bg-[#090e21] border-2 ${commander.borderColor} rounded-3xl p-4 sm:p-6 shadow-2xl relative ${commander.glowColor} overflow-hidden max-h-[85vh] sm:max-h-[88vh] overflow-y-auto my-auto`}
      >
        {/* Background Subtle Tech Grid */}
        <div className="absolute inset-0 radar-grid opacity-30 pointer-events-none" />

        {/* Skip Tutorial Button */}
        <button
          onClick={onComplete}
          className="absolute top-3 left-3 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition z-20 border border-slate-700 text-xs flex items-center gap-1"
        >
          <span>رد کردن آموزش</span>
          <X size={14} />
        </button>

        {/* Commander Character Row (Avatar on Left, Speech Bubble on Right) */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 relative z-10">
          
          {/* Commander Character Portrait Frame */}
          <div className="relative shrink-0 flex flex-col items-center">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-gradient-to-tr ${commander.badgeColor} shadow-xl border border-white/20 relative group`}>
              <img 
                src={commander.avatar} 
                alt={commander.name}
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute -bottom-2 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full shadow-lg">
                <Shield size={14} className="fill-slate-950" />
              </div>
            </div>
            
            <div className="text-center mt-1.5">
              <span className="text-[11px] font-black text-white block">{commander.name}</span>
              <span className={`text-[9px] font-bold ${isGirls ? 'text-pink-300' : 'text-cyan-300'}`}>
                {commander.title}
              </span>
            </div>
          </div>

          {/* Speech Dialog Body */}
          <div className="flex-1 space-y-2.5 text-right w-full">
            
            {/* Step Progress Pill */}
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                isGirls 
                  ? 'bg-pink-950/80 text-pink-300 border-pink-500/50' 
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
              }`}>
                مرحله آموزش {currentStep + 1} از {steps.length}
              </span>

              <div className="flex gap-1">
                {steps.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStep 
                        ? isGirls ? 'bg-pink-500 w-4' : 'bg-cyan-400 w-4'
                        : idx < currentStep 
                          ? 'bg-slate-500' 
                          : 'bg-slate-800'
                    }`} 
                  />
                ))}
              </div>
            </div>

            {/* Dialog Heading */}
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-xl ${isGirls ? 'bg-pink-500/20 text-pink-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                <currentStepData.icon size={18} />
              </div>
              <h3 className="text-sm sm:text-base font-black text-white">
                {currentStepData.title}
              </h3>
            </div>

            {/* Speech Text Bubble */}
            <div className="bg-[#050917]/90 rounded-2xl p-3 sm:p-3.5 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
              {currentStepData.text}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 transition flex items-center gap-1 ${
                  currentStep === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ArrowRight size={14} />
                <span>قبلی</span>
              </button>

              <button
                onClick={handleNext}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 shadow-lg transform hover:scale-105 active:scale-95 ${
                  isGirls
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-pink-900/50'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-cyan-900/50'
                }`}
              >
                <span>{currentStep === steps.length - 1 ? 'ورود به میدان و شروع ماجراجویی' : 'مرحله بعد'}</span>
                {currentStep === steps.length - 1 ? <Check size={16} /> : <ArrowLeft size={16} />}
              </button>
            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
