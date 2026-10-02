import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';

const BOY_GUIDE_IMG = '/src/assets/images/guide_commander_boy_1790940066682.jpg';
const GIRL_GUIDE_IMG = '/src/assets/images/guide_commander_girl_1790940078146.jpg';

export interface GameCharacterGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: () => void;
  themeMode?: 'girls' | 'boys';
  siteSettings?: any;
  actionText?: string;
}

export const GameCharacterGuideModal: React.FC<GameCharacterGuideModalProps> = ({
  isOpen,
  onClose,
  onAction,
  themeMode = 'boys',
  siteSettings,
  actionText = 'ورود به نقشه مراحل'
}) => {
  const isGirls = themeMode === 'girls';
  const [currentStep, setCurrentStep] = useState(0);

  // Dynamic guide steps from siteSettings or fallback default
  const guideSteps = (siteSettings?.guideSteps && Array.isArray(siteSettings.guideSteps) && siteSettings.guideSteps.length > 0)
    ? siteSettings.guideSteps
    : [
        {
          title: 'خوش آمدی فرمانده!',
          text: 'به سامانه بزرگ ماجراجویی و ارزیابی استراتژیک «اتاق جنگ» خوش آمدی! پرونده هفت‌خوان آماده آغاز است.',
          highlight: 'پرونده ویژه هفت‌خوان'
        },
        {
          title: 'نقشه عملیاتی و چالش‌ها',
          text: 'مسابقه شامل ۷ مرحله داستانی است. با ورود به هر مرحله، پاسخ به معماها و حل چالش‌های فکری، کریستال‌های امتیاز آزاد می‌شوند.',
          highlight: '۷ مرحله کارآگاهی'
        },
        {
          title: 'جوایز ۵۰ میلیارد ریالی',
          text: 'علاوه بر کنسول‌های بازی و تبلت برای برترین‌های کشوری، بیش از ۱۰۰ هزار جایزه و کد تخفیف برای تمام شرکت‌کنندگان در نظر گرفته شده است.',
          highlight: 'جوایز و امتیازات'
        }
      ];

  if (!isOpen) return null;

  // Ensure currentStep is within valid bounds
  const safeStepIndex = Math.min(currentStep, guideSteps.length - 1);
  const activeStep = guideSteps[safeStepIndex] || guideSteps[0];

  const characterImg = isGirls 
    ? (siteSettings?.girlsGuideImage || siteSettings?.girlsBannerImage || GIRL_GUIDE_IMG) 
    : (siteSettings?.boysGuideImage || siteSettings?.boysBannerImage || BOY_GUIDE_IMG);

  const handleNext = () => {
    if (safeStepIndex < guideSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      if (onAction) {
        onAction();
      }
      onClose();
    }
  };

  const handlePrev = () => {
    if (safeStepIndex > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-6 dir-rtl select-none"
        dir="rtl"
        role="dialog"
        aria-modal="true"
      >
        {/* Transparent backdrop - completely clear without blur so background app is crystal clear */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20"
        />

        {/* Floating Game Dialogue Container - Absolutely NO outer box or frame */}
        <div className="relative z-10 w-full max-w-3xl flex flex-col md:flex-row items-center md:items-end justify-center gap-2 sm:gap-6 pointer-events-none pb-2 sm:pb-6">
          
          {/* 1. STANDING GAME CHARACTER AVATAR */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto shrink-0 relative flex flex-col items-center"
          >
            {/* Soft ground shadow */}
            <div className="absolute -bottom-2 w-36 h-6 bg-black/40 rounded-full blur-md" />
            
            {/* Character Image without any outer box/card */}
            <div className="w-32 h-32 sm:w-44 sm:h-44 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-amber-400/90 shadow-[0_0_30px_rgba(251,191,36,0.5)] relative bg-slate-900">
              <img 
                src={characterImg} 
                alt="راهنمای بازی" 
                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            {/* Character Name Tag */}
            <div className="mt-2 px-3.5 py-1 rounded-full bg-slate-950/90 border border-amber-400/80 text-amber-300 text-[11px] font-black shadow-lg">
              {isGirls ? 'فرمانده راهنما' : 'راهنمای عملیات'}
            </div>
          </motion.div>

          {/* 2. CLASH-OF-CLANS STYLE GAME SPEECH BALLOON */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto relative w-full max-w-lg bg-white text-slate-900 rounded-3xl p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.6)] border-4 border-[#e2d5b8] font-sans"
          >
            {/* Speech Bubble Arrow Tail pointing towards the character on Desktop */}
            <div 
              className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent border-l-[16px] border-l-white drop-shadow-sm" 
            />
            {/* Speech Bubble Arrow Tail pointing towards the character on Mobile */}
            <div 
              className="block md:hidden absolute -top-3.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[14px] border-b-white drop-shadow-sm" 
            />

            {/* Close Cross Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
              title="بستن"
            >
              <X size={16} />
            </button>

            {/* Bubble Header */}
            <div className="flex items-center gap-2 mb-2 pr-1">
              <Sparkles size={18} className="text-amber-500" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {activeStep.title}
              </h3>
            </div>

            {/* Dialogue Body Text */}
            <p className="text-xs sm:text-sm text-slate-700 font-bold leading-relaxed pr-1 mb-4 text-justify">
              {activeStep.text}
            </p>

            {/* Step Indicators & Navigation Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
              
              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5">
                {guideSteps.map((_, idx) => (
                  <span 
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      idx === safeStepIndex ? 'w-6 bg-amber-500' : 'w-2 bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {safeStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                    <span>قبلی</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-105 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <span>{safeStepIndex === guideSteps.length - 1 ? actionText : 'بعدی'}</span>
                  {safeStepIndex === guideSteps.length - 1 ? <Check size={14} /> : <ChevronLeft size={14} />}
                </button>
              </div>

            </div>

          </motion.div>

        </div>

      </div>
    </AnimatePresence>
  );
};

export default GameCharacterGuideModal;
