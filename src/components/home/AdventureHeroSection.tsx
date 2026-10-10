import React, { useState, useEffect } from 'react';
import { 
  Shield, Swords, Flame, Target, Trophy, Flag, Compass, Heart, Star, Zap, Award, Radio, Film, Lock, Clock
} from 'lucide-react';
import { User, SiteSettings } from '../../types';
import TacticalVideoPlayer from '../TacticalVideoPlayer';

const WARROOM_LOGO_PATH = '/images/logos/warroom_logo.webp';
const BOYS_BANNER_PATH = '/images/banners/boys_registration_banner.webp';
const BOYS_BANNER_MOBILE_PATH = '/images/banners/boys_registration_banner_mobile.webp';
const GIRLS_BANNER_PATH = '/images/banners/girls_registration_banner.webp';
const GIRLS_BANNER_MOBILE_PATH = '/images/banners/girls_registration_banner_mobile.webp';

// Fast reliable video URLs with warroom video as primary
const FALLBACK_VIDEOS = [
  '/videowarroom.mp4'
];

/**
 * کامپوننت تایپ انیمیشنی (Typewriter Effect)
 * متن را به صورت کاراکتر به کاراکتر با کرسر نئونی تایپ می‌کند
 */
export const AnimatedTypingText: React.FC<{ 
  text: string; 
  className?: string;
  color?: string;
  font?: string;
  style?: React.CSSProperties;
}> = ({ text, className, color, font, style }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  React.useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }

    let timer: any;
    const fullText = text;

    if (!isDeleting) {
      if (displayedText.length < fullText.length) {
        timer = setTimeout(() => {
          setDisplayedText(fullText.slice(0, displayedText.length + 1));
        }, 70);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 3500);
      }
    } else {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(fullText.slice(0, displayedText.length - 1));
        }, 35);
      } else {
        setIsDeleting(false);
        setLoopNum(prev => prev + 1);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, text, loopNum]);

  if (!text) return null;

  const finalColor = color || '#06b6d4';

  return (
    <div 
      className={`flex items-center justify-center gap-1 dir-rtl ${className || ''}`} 
      dir="rtl"
      style={{
        color: finalColor,
        fontFamily: font || 'inherit',
        textShadow: `0 0 16px ${finalColor}66`,
        ...style
      }}
    >
      <span className="inline-block transition-all">{displayedText}</span>
      <span 
        className="w-1.5 h-4 sm:h-5 rounded-sm animate-pulse shrink-0" 
        style={{ backgroundColor: finalColor, boxShadow: `0 0 8px ${finalColor}` }}
      />
    </div>
  );
};

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

  // ثبت‌نام همواره فعال است و هیچ ارتباطی با تایمر ندارد
  const isBannersDisabled = Boolean(siteSettings?.disableBannerLinks);
  const shouldHideBanners = Boolean(siteSettings?.hideRegistrationBanners);

  const handleBannerAction = () => {
    // اگر بنرها غیرفعال شده باشند، به صفحه ثبت‌نام و ورود هدایت نمی‌شوند
    if (isBannersDisabled) {
      return;
    }
    if (currentUser) {
      onGoToDashboard?.();
    } else {
      onOpenRegister();
    }
  };

  const handleFemaleClick = () => {
    if (isBannersDisabled) return;
    onSelectTheme?.('girls');
    handleBannerAction();
  };

  const handleMaleClick = () => {
    if (isBannersDisabled) return;
    onSelectTheme?.('boys');
    handleBannerAction();
  };

  return (
    <div className="w-full text-center space-y-6 dir-rtl">
      {/* 🛡️ WarRoom Logo Header */}
      <div className="flex flex-col justify-center items-center py-1 gap-2">
        <img 
          src={siteSettings?.customLogoUrl || siteSettings?.heroImage || WARROOM_LOGO_PATH} 
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

        {/* ✍️ Animated Typing Text (متن نوشتاری انیمیشنی زیر آیکون اول صفحه اصلی) */}
        {(siteSettings?.iconAnimatedText || siteSettings?.pageIconText) && (
          <div className="py-0.5 px-3 max-w-xl mx-auto">
            <AnimatedTypingText 
              text={siteSettings?.iconAnimatedText || siteSettings?.pageIconText || ''}
              color={siteSettings?.animatedTextColor}
              font={siteSettings?.siteFontFamily}
              className="text-xs sm:text-sm md:text-base font-black tracking-wide"
            />
            {siteSettings?.pageIconSubtext && (
              <p 
                className="text-[11px] sm:text-xs mt-1 max-w-md mx-auto leading-relaxed"
                style={{ color: siteSettings?.siteTextColor || '#cbd5e1' }}
              >
                {siteSettings.pageIconSubtext}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 1. ANIMATED COMMANDER BANNERS (SINGLE OR DUAL LINE)                  */}
      {/* ==================================================================== */}
      {!shouldHideBanners && (
        <div className="w-full overflow-hidden bg-transparent border-0">
          {/* Banner Grid (Single Line Full-Width or Dual Line Columns) */}
          <div className={`w-full ${
            siteSettings?.bannerLayout === 'single'
              ? 'grid grid-cols-1 gap-4 max-w-xl mx-auto'
              : 'grid grid-cols-2 gap-2.5 sm:gap-4'
          }`}>
            
            {/* Female Commander Image (تم دخترانه) */}
            <div 
              onClick={isBannersDisabled ? undefined : handleFemaleClick}
              role={isBannersDisabled ? 'img' : 'button'}
              tabIndex={isBannersDisabled ? -1 : 0}
              className={`group relative rounded-2xl overflow-hidden transition-shadow duration-300 shadow-[0_0_20px_rgba(0,0,0,0.4)] aspect-[16/10] border-0 border-transparent select-none ${
                isBannersDisabled 
                  ? 'cursor-default opacity-85' 
                  : 'cursor-pointer hover:shadow-[0_0_30px_rgba(236,72,153,0.45)]'
              }`}
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
                className="w-full h-full object-cover rounded-2xl border-0"
              />
              {isBannersDisabled && (
                <div className="absolute top-2 right-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-rose-300 flex items-center gap-1 shadow-lg">
                  <Lock size={11} />
                  <span>ثبت‌نام بسته است</span>
                </div>
              )}
            </div>

            {/* Male Commander Image (تم مردانه/پسرانه) */}
            <div 
              onClick={isBannersDisabled ? undefined : handleMaleClick}
              role={isBannersDisabled ? 'img' : 'button'}
              tabIndex={isBannersDisabled ? -1 : 0}
              className={`group relative rounded-2xl overflow-hidden transition-shadow duration-300 shadow-[0_0_20px_rgba(0,0,0,0.4)] aspect-[16/10] border-0 border-transparent select-none ${
                isBannersDisabled 
                  ? 'cursor-default opacity-85' 
                  : 'cursor-pointer hover:shadow-[0_0_30px_rgba(6,182,212,0.45)]'
              }`}
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
                className="w-full h-full object-cover rounded-2xl border-0"
              />
              {isBannersDisabled && (
                <div className="absolute top-2 right-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-rose-300 flex items-center gap-1 shadow-lg">
                  <Lock size={11} />
                  <span>ثبت‌نام بسته است</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. COMMERCIAL AD VIDEO (IF CONFIGURED IN VISUAL STUDIO)              */}
      {/* ==================================================================== */}
      {siteSettings?.adVideoUrl && (
        <div
          className="w-full max-w-4xl mx-auto p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-slate-950 to-indigo-950/40 border border-purple-500/40 shadow-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-300 font-black text-xs sm:text-sm">
              <Film size={18} className="text-purple-400" />
              <span>{siteSettings.adVideoTitle || 'تیزر ویدیویی و تبلیغاتی'}</span>
            </div>
            {siteSettings.adVideoBadge && (
              <span className="bg-purple-500/30 text-purple-200 border border-purple-500/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {siteSettings.adVideoBadge}
              </span>
            )}
          </div>
          <div className="relative rounded-2xl overflow-hidden bg-black border border-purple-500/30 aspect-video shadow-xl">
            <video
              src={siteSettings.adVideoUrl}
              controls
              className="w-full h-full object-cover"
              poster={siteSettings.heroImage}
            />
          </div>
          {siteSettings.adVideoSubtitle && (
            <p className="text-xs text-slate-300 leading-relaxed text-right">{siteSettings.adVideoSubtitle}</p>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. PURE CLEAN VIDEO WITH SMOOTH SCROLL ANIMATION & ULTRA FAST PLAYER */}
      {/* ==================================================================== */}
      <div 
        className="w-full pt-2 sm:pt-4"
      >
        <TacticalVideoPlayer
          src={currentVideoUrl}
          poster={siteSettings?.adVideoPosterUrl}
          aspectRatioClass="aspect-[16/9]"
          className="rounded-2xl sm:rounded-3xl border border-cyan-500/30 shadow-2xl"
        />
      </div>

    </div>
  );
}
