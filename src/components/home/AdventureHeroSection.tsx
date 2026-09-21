import React from 'react';
import { User, SiteSettings } from '../../types';

const WARROOM_LOGO_PATH = '/images/logos/warroom_logo.webp';
const BOYS_BANNER_PATH = '/images/banners/boys_registration_banner.webp';
const BOYS_BANNER_MOBILE_PATH = '/images/banners/boys_registration_banner_mobile.webp';
const GIRLS_BANNER_PATH = '/images/banners/girls_registration_banner.webp';
const GIRLS_BANNER_MOBILE_PATH = '/images/banners/girls_registration_banner_mobile.webp';

interface AdventureHeroSectionProps {
  themeMode: 'girls' | 'boys';
  currentUser: User | null;
  onOpenRegister: () => void;
  onGoToDashboard?: () => void;
  siteSettings?: SiteSettings;
  onNavigate?: (tab: string) => void;
}

export default function AdventureHeroSection({
  themeMode,
  currentUser,
  onOpenRegister,
  onGoToDashboard,
  siteSettings,
}: AdventureHeroSectionProps) {
  const isGirls = themeMode === 'girls';

  const girlsBannerSrc = siteSettings?.girlsBannerImage || GIRLS_BANNER_PATH;
  const boysBannerSrc = siteSettings?.boysBannerImage || BOYS_BANNER_PATH;
  const isCustomBanner = Boolean(siteSettings?.girlsBannerImage || siteSettings?.boysBannerImage);

  const handleBannerAction = () => {
    if (currentUser) {
      onGoToDashboard?.();
    } else {
      onOpenRegister();
    }
  };

  return (
    <div className="w-full text-center space-y-3">
      {/* 🛡️ Logo Image */}
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

      {/* Interactive Clean Image Registration Banner */}
      <div 
        onClick={handleBannerAction}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBannerAction();
          }
        }}
        className="group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer transform hover:scale-[1.008] active:scale-[0.992] transition-all duration-300"
      >
        {/* Banner Artwork Container - Layout Stable Offline & Online */}
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl min-h-[160px] sm:min-h-[220px] aspect-[1500/844] bg-slate-900/40">
          <img 
            src={isGirls ? girlsBannerSrc : boysBannerSrc}
            srcSet={
              !isCustomBanner
                ? isGirls
                  ? `${GIRLS_BANNER_MOBILE_PATH} 750w, ${GIRLS_BANNER_PATH} 1200w`
                  : `${BOYS_BANNER_MOBILE_PATH} 750w, ${BOYS_BANNER_PATH} 1200w`
                : undefined
            }
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
            alt={isGirls ? "بنر ثبت‌نام دختران اتاق جنگ" : "بنر ثبت‌نام پسران اتاق جنگ"} 
            referrerPolicy="no-referrer"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1200}
            height={675}
            className="w-full h-auto max-h-[75vh] object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.015]"
          />
        </div>
      </div>
    </div>
  );
}

