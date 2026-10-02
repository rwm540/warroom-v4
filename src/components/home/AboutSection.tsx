import React from 'react';
import { ChevronLeft, Info, Sparkles, ShieldCheck, Target, Award } from 'lucide-react';

interface AboutSectionProps {
  onOpenMore: () => void;
  siteSettings?: any;
}

export default function AboutSection({ onOpenMore, siteSettings }: AboutSectionProps) {
  const hasFeatures = siteSettings?.aboutFeature1Title || siteSettings?.aboutFeature2Title || siteSettings?.aboutFeature3Title;

  return (
    <div 
      onClick={onOpenMore}
      className="my-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#0a0f24]/90 backdrop-blur-xl border border-amber-500/30 relative overflow-hidden dir-rtl shadow-[0_4px_20px_rgba(0,0,0,0.5)] group hover:border-amber-400/60 transition-all cursor-pointer"
    >
      {/* Background Subtle Tactical Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Optional Top Banner Image */}
      {siteSettings?.aboutSectionBannerImage && (
        <div className="w-full h-32 sm:h-40 rounded-2xl overflow-hidden mb-3.5 border border-amber-500/20">
          <img 
            src={siteSettings.aboutSectionBannerImage} 
            alt={siteSettings?.aboutSectionTitle || 'درباره ما'} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        </div>
      )}

      <div className="relative z-10 space-y-3 text-right">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 overflow-hidden shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              {siteSettings?.aboutSectionIconUrl ? (
                <img src={siteSettings.aboutSectionIconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Info size={19} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  {siteSettings?.aboutSectionTitle || 'درباره ما و پروژه اتاق جنگ'}
                </h2>
                {siteSettings?.aboutSectionBadgeText && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    {siteSettings.aboutSectionBadgeText}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-amber-300/90 font-bold block mt-0.5">
                {siteSettings?.aboutSectionSubtitle || 'معرفی اهداف، ساختار و رسالت سامانه'}
              </span>
            </div>
          </div>
          <ChevronLeft size={18} className="text-amber-400 group-hover:translate-x-[-3px] transition-transform shrink-0" />
        </div>

        <p className="text-xs text-slate-300 leading-relaxed text-justify">
          {siteSettings?.aboutSectionText || siteSettings?.aboutText || 'پلتفرم اتاق جنگ، سامانه جامع شبیه‌سازی تصمیم‌گیری استراتژیک، ارزیابی هوشمند و رقابت‌های گروهی دانش‌آموزی است که با هدف ارتقای آگاهی و تفکر تفکیکی طراحی گردیده است.'}
        </p>

        {/* Optional Customizable Feature Highlights */}
        {hasFeatures && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-amber-500/20">
            {siteSettings?.aboutFeature1Title && (
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-right">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Target size={13} className="text-amber-400" />
                  <span>{siteSettings.aboutFeature1Title}</span>
                </div>
                {siteSettings?.aboutFeature1Desc && (
                  <p className="text-[10px] text-slate-300 mt-0.5">{siteSettings.aboutFeature1Desc}</p>
                )}
              </div>
            )}
            {siteSettings?.aboutFeature2Title && (
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-right">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-amber-400" />
                  <span>{siteSettings.aboutFeature2Title}</span>
                </div>
                {siteSettings?.aboutFeature2Desc && (
                  <p className="text-[10px] text-slate-300 mt-0.5">{siteSettings.aboutFeature2Desc}</p>
                )}
              </div>
            )}
            {siteSettings?.aboutFeature3Title && (
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-right">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Award size={13} className="text-amber-400" />
                  <span>{siteSettings.aboutFeature3Title}</span>
                </div>
                {siteSettings?.aboutFeature3Desc && (
                  <p className="text-[10px] text-slate-300 mt-0.5">{siteSettings.aboutFeature3Desc}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

