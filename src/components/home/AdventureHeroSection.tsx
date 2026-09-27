import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, SiteSettings } from '../../types';
import TacticalVideoPlayer from '../TacticalVideoPlayer';

const WARROOM_LOGO_PATH = '/images/logos/warroom_logo.webp';
const BOYS_BANNER_PATH = '/images/banners/boys_registration_banner.webp';
const BOYS_BANNER_MOBILE_PATH = '/images/banners/boys_registration_banner_mobile.webp';
const GIRLS_BANNER_PATH = '/images/banners/girls_registration_banner.webp';
const GIRLS_BANNER_MOBILE_PATH = '/images/banners/girls_registration_banner_mobile.webp';

// Fast reliable video URLs with warroom video as primary
const FALLBACK_VIDEOS = [
  '/videowarroom.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://vjs.zencdn.net/v/oceans.mp4'
];

interface AdventureHeroSectionProps {
  themeMode: 'girls' | 'boys';
  currentUser: User | null;
  onOpenRegister: () => void;
  onGoToDashboard?: () => void;
  siteSettings?: SiteSettings;
  onNavigate?: (tab: string) => void;
  onSelectTheme?: (theme: 'girls' | 'boys') => void;
}

export default function AdventureHeroSection({
  themeMode,
  currentUser,
  onOpenRegister,
  onGoToDashboard,
  siteSettings,
  onSelectTheme,
}: AdventureHeroSectionProps) {
  const isGirls = themeMode === 'girls';
  const [videoIndex] = useState(0);

  const girlsBannerSrc = siteSettings?.girlsBannerImage || GIRLS_BANNER_PATH;
  const boysBannerSrc = siteSettings?.boysBannerImage || BOYS_BANNER_PATH;
  const isCustomBanner = Boolean(siteSettings?.girlsBannerImage || siteSettings?.boysBannerImage);

  // Video URL selection
  const customVideoUrl = siteSettings?.heroVideoUrl?.trim() || siteSettings?.teaserVideoUrl?.trim();
  const currentVideoUrl = customVideoUrl || FALLBACK_VIDEOS[videoIndex] || FALLBACK_VIDEOS[0];

  const handleBannerAction = () => {
    if (currentUser) {
      onGoToDashboard?.();
    } else {
      onOpenRegister();
    }
  };

  const handleFemaleClick = () => {
    onSelectTheme?.('girls');
    handleBannerAction();
  };

  const handleMaleClick = () => {
    onSelectTheme?.('boys');
    handleBannerAction();
  };

  return (
    <div className="w-full text-center space-y-6 dir-rtl">
      {/* 🛡️ WarRoom Logo Header */}
      <div className="flex justify-center items-center py-1">
        <img 
          src={WARROOM_LOGO_PATH} 
          alt="لوگوی اتاق جنگ" 
          width={112}
          height={112}
          loading="eager"
          decoding="async"
          className={`w-20 sm:w-24 md:w-28 h-20 sm:h-24 md:h-28 rounded-full object-cover cursor-pointer transition-all duration-300 hover:scale-105 select-none bg-transparent ${
            isGirls 
              ? 'drop-shadow-[0_0_15px_rgba(255,19,137,0.4)]' 
              : 'drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]'
          }`}
          onClick={handleBannerAction}
        />
      </div>

      {/* ==================================================================== */}
      {/* 1. ANIMATED SIDE-BY-SIDE COMMANDER IMAGES WITH THEME SWITCH */}
      {/* ==================================================================== */}
      <div className="w-full overflow-hidden bg-transparent">
        {/* Side-by-Side Grid (2 Columns on ALL devices) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">
          
          {/* Female Commander Image (تم دخترانه + هدایت به ثبت نام) */}
          <motion.div 
            onClick={handleFemaleClick}
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
            whileHover={{ scale: 1.03, y: -6 }}
            whileTap={{ scale: 0.96 }}
            transition={{
              y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
              scale: { duration: 0.2 },
              opacity: { duration: 0.3 }
            }}
            role="button"
            tabIndex={0}
            className="group relative rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 shadow-[0_0_15px_rgba(236,72,153,0.25)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] bg-slate-900/60 aspect-[16/10]"
          >
            <img 
              src={girlsBannerSrc}
              srcSet={
                !isCustomBanner
                  ? `${GIRLS_BANNER_MOBILE_PATH} 750w, ${GIRLS_BANNER_PATH} 1200w`
                  : undefined
              }
              sizes="(max-width: 640px) 50vw, 600px"
              alt="تصویر دختران - تم دخترانه" 
              width={600}
              height={375}
              referrerPolicy="no-referrer"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover rounded-2xl"
            />
          </motion.div>

          {/* Male Commander Image (تم مردانه/پسرانه + هدایت به ثبت نام) */}
          <motion.div 
            onClick={handleMaleClick}
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
            whileHover={{ scale: 1.03, y: -6 }}
            whileTap={{ scale: 0.96 }}
            transition={{
              y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 },
              scale: { duration: 0.2 },
              opacity: { duration: 0.3 }
            }}
            role="button"
            tabIndex={0}
            className="group relative rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] bg-slate-900/60 aspect-[16/10]"
          >
            <img 
              src={boysBannerSrc}
              srcSet={
                !isCustomBanner
                  ? `${BOYS_BANNER_MOBILE_PATH} 750w, ${BOYS_BANNER_PATH} 1200w`
                  : undefined
              }
              sizes="(max-width: 640px) 50vw, 600px"
              alt="تصویر پسران - تم مردانه" 
              width={600}
              height={375}
              referrerPolicy="no-referrer"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover rounded-2xl"
            />
          </motion.div>

        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. PURE CLEAN VIDEO WITH SMOOTH SCROLL ANIMATION & ULTRA FAST PLAYER */}
      {/* ==================================================================== */}
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ margin: "-40px", amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full pt-2 sm:pt-4"
      >
        <TacticalVideoPlayer
          src={currentVideoUrl}
          aspectRatioClass="aspect-[16/9]"
          className="rounded-2xl sm:rounded-3xl border border-cyan-500/30 shadow-2xl"
        />
      </motion.div>

    </div>
  );
}
