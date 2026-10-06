import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  Sparkles,
  Compass
} from 'lucide-react';
import { User } from '../types';
import { GuideTutorialConfig, defaultGuideConfig } from './AdminGuideTutorialManager';

// Default in-project official commander avatars from public/images/avatar/
const DEFAULT_BOY_AVATAR = '/images/avatar/male/Cartoon_commander_saluting_2K_202608210048.jpeg';
const DEFAULT_GIRL_AVATAR = '/images/avatar/woman/Commander_giving_orders_2K_202608210108.jpeg';

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

  // In-project character avatar selection:
  // 1. If admin configured custom guide avatar in guideConfig, use it
  // 2. If user has chosen an avatar in their profile (and guideConfig allows user avatar), prioritize currentUser.avatar_url
  // 3. Fallback to the project's official commander avatars in public/images/avatar/
  const configuredAvatar = isGirls
    ? (guideConfig?.girlAvatarUrl || DEFAULT_GIRL_AVATAR)
    : (guideConfig?.boyAvatarUrl || DEFAULT_BOY_AVATAR);

  const characterAvatar = (currentUser?.avatar_url && guideConfig?.useUserAvatar !== false)
    ? currentUser.avatar_url
    : configuredAvatar;

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
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end p-2 sm:p-4 dir-rtl font-sans select-none overflow-hidden">
      
      {/* 🌟 100% CLEAR TRANSPARENT BACKDROP - NO BLUR, NO DARKNESS */}
      <div 
        className="absolute inset-0 bg-transparent pointer-events-none"
      />

      {/* 🏰 COMPACT DIALOGUE UNIT: AVATAR DIRECTLY NEXT TO TEXT (NO EMPTY VOID OR GAP) */}
      <div className="relative z-20 w-fit max-w-[96vw] sm:max-w-xl mx-auto flex flex-row items-end justify-center gap-2 sm:gap-2.5 pb-1 sm:pb-2 pointer-events-none">
        
        {/* 1. PROJECT COMMANDER CHARACTER AVATAR (NO BORDER, NO WHITE BACKGROUND, CLEAN FIGURE ONLY) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="pointer-events-auto shrink-0 relative flex flex-col items-center"
        >
          {/* Soft Ground Shadow */}
          <div className="absolute -bottom-1 w-16 sm:w-20 h-2 bg-black/60 rounded-full blur-sm" />

          {/* Clean Tactical Character Avatar (Zero white border, zero white background) */}
          <div className={`w-18 h-22 sm:w-24 sm:h-30 md:w-28 md:h-36 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_12px_28px_rgba(0,0,0,0.7)] relative bg-slate-900 border-2 ${
            isGirls ? 'border-pink-500/60 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
          }`}>
            <img 
              src={characterAvatar} 
              alt={characterName} 
              className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Commander Name Badge */}
          <span className="text-[10px] sm:text-[11px] font-black text-amber-300 bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow-md whitespace-nowrap mt-1">
            {characterName}
          </span>
        </motion.div>

        {/* 2. GAME SPEECH BALLOON (DIRECTLY NEXT TO AVATAR) */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto relative w-[280px] sm:w-[350px] md:w-[410px] max-w-[calc(100vw-105px)] bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-[0_20px_50px_rgba(0,0,0,0.65)] border-2 sm:border-4 border-[#e2d5b8]"
        >
          {/* Speech Bubble Arrow Tail pointing directly towards character on the right (RTL) */}
          <div 
            className="absolute -right-2.5 sm:-right-3.5 bottom-6 sm:bottom-8 w-0 h-0 border-t-[8px] sm:border-t-[10px] border-t-transparent border-b-[8px] sm:border-b-[10px] border-b-transparent border-l-[10px] sm:border-l-[14px] border-l-white drop-shadow-sm" 
          />

          {/* Skip / Close Button */}
          <button
            onClick={onComplete}
            className="absolute top-2.5 left-2.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            title="رد کردن راهنما"
          >
            <X size={13} />
          </button>

          {/* Balloon Header */}
          <div className="flex items-center gap-1.5 mb-1 pr-0.5">
            <Sparkles size={15} className="text-amber-500 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
              {currentStepData.title}
            </h3>
          </div>

          {/* Speech Text Content */}
          <p className="text-xs sm:text-[13px] text-slate-700 font-bold leading-relaxed mb-3 text-justify">
            {currentStepData.text}
          </p>

          {/* Balloon Footer: Step Dots & Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
            
            {/* Step Indicators */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <span 
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-4 sm:w-5 bg-amber-500' : 'w-1.5 sm:w-2 bg-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRight size={12} />
                  <span>قبلی</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-105 text-slate-950 font-black text-xs shadow flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <span>{currentStep === steps.length - 1 ? 'شروع مأموریت' : 'مرحله بعد'}</span>
                {currentStep === steps.length - 1 ? <Check size={12} /> : <ArrowLeft size={12} />}
              </button>
            </div>

          </div>

        </motion.div>

      </div>

    </div>
  );
}

