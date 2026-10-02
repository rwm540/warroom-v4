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
  Sparkles,
  Compass
} from 'lucide-react';
import { User } from '../types';
import { GuideTutorialConfig, defaultGuideConfig } from './AdminGuideTutorialManager';

const BOY_GUIDE_IMG = '/src/assets/images/guide_commander_boy_1790940066682.jpg';
const GIRL_GUIDE_IMG = '/src/assets/images/guide_commander_girl_1790940078146.jpg';

interface OnboardingCommanderTutorialProps {
  currentUser: User | null;
  onComplete: () => void;
  onNavigateTab?: (tab: string) => void;
  guideConfig?: GuideTutorialConfig;
}

export default function OnboardingCommanderTutorial({
  currentUser,
  onComplete,
  onNavigateTab,
  guideConfig
}: OnboardingCommanderTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isGirls = currentUser?.gender === 'دختر' || localStorage.getItem('hisstory_theme_mode') === 'girls';

  const characterAvatar = isGirls ? GIRL_GUIDE_IMG : BOY_GUIDE_IMG;
  const characterName = isGirls ? 'فرمانده نگار' : 'فرمانده کاوه';

  // Use dynamic steps from admin config or fallback to defaults
  const steps = guideConfig && Array.isArray(guideConfig.steps) && guideConfig.steps.length > 0
    ? guideConfig.steps
    : defaultGuideConfig.steps;

  const currentStepData = steps[currentStep] || steps[0];

  // Auto switch tab in background when step changes
  useEffect(() => {
    if (onNavigateTab && currentStepData?.targetTab) {
      onNavigateTab(currentStepData.targetTab);
    }
  }, [currentStep, currentStepData?.targetTab]);

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

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end p-3 sm:p-6 dir-rtl font-sans select-none overflow-hidden">
      
      {/* 🌟 100% CLEAR TRANSPARENT BACKDROP - NO BLUR, NO DARKNESS, DOES NOT DISMISS ON CLICK */}
      <div 
        className="absolute inset-0 bg-transparent pointer-events-none"
      />

      {/* 🏰 CLASH-OF-CLANS STYLE FLOATING GUIDE: STANDING CHARACTER + SPEECH BALLOON */}
      <div className="relative z-20 w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-center sm:items-end justify-center gap-3 sm:gap-5 pb-2 pointer-events-none">
        
        {/* 1. STANDING GAME CHARACTER AVATAR (NO BOX/CARD FRAME) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="pointer-events-auto shrink-0 relative flex flex-col items-center"
        >
          {/* Soft Ground Shadow */}
          <div className="absolute -bottom-1.5 w-28 sm:w-36 h-4 bg-black/40 rounded-full blur-sm" />

          {/* Character Figure */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] relative bg-slate-900">
            <img 
              src={characterAvatar} 
              alt={characterName} 
              className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Character Name Tag */}
          <div className="mt-1.5 px-3 py-0.5 rounded-full bg-slate-950/90 border border-amber-400 text-amber-300 text-[10px] sm:text-xs font-black shadow-lg">
            {characterName}
          </div>
        </motion.div>

        {/* 2. GAME SPEECH BALLOON (WHITE/CREAM COMIC DIALOGUE BOX WITH ARROW POINTING TO CHARACTER) */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-auto relative w-full flex-1 bg-white text-slate-900 rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-4 border-[#e2d5b8]"
        >
          {/* Speech Bubble Arrow Tail pointing towards character on desktop (Right side in RTL) */}
          <div 
            className="hidden sm:block absolute -right-3.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[14px] border-l-white drop-shadow-sm" 
          />
          {/* Speech Bubble Arrow Tail pointing towards character on mobile (Top side) */}
          <div 
            className="block sm:hidden absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[12px] border-b-white drop-shadow-sm" 
          />

          {/* Skip / Close Button */}
          <button
            onClick={onComplete}
            className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            title="رد کردن راهنما"
          >
            <X size={14} />
          </button>

          {/* Balloon Header */}
          <div className="flex items-center gap-1.5 mb-1.5 pr-0.5">
            <Sparkles size={16} className="text-amber-500" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
              {currentStepData.title}
            </h3>
          </div>

          {/* Speech Text Content */}
          <p className="text-xs sm:text-[13px] text-slate-700 font-bold leading-relaxed mb-3.5 text-justify">
            {currentStepData.text}
          </p>

          {/* Balloon Footer: Step Dots & Navigation */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80">
            
            {/* Step Indicators */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <span 
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-5 bg-amber-500' : 'w-2 bg-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRight size={13} />
                  <span>قبلی</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-105 text-slate-950 font-black text-xs shadow flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <span>{currentStep === steps.length - 1 ? 'شروع مأموریت' : 'مرحله بعد'}</span>
                {currentStep === steps.length - 1 ? <Check size={13} /> : <ArrowLeft size={13} />}
              </button>
            </div>

          </div>

        </motion.div>

      </div>

    </div>
  );
}
