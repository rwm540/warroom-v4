import React from 'react';
import { Send, MessageSquare } from 'lucide-react';

interface SocialMessengersWidgetsProps {
  themeMode: 'girls' | 'boys';
  siteSettings?: any;
  onOpenStages?: () => void;
  onOpenGuide?: () => void;
  triggerAlert: (msg: string) => void;
}

export default function SocialMessengersWidgets({
  themeMode,
  siteSettings,
  triggerAlert
}: SocialMessengersWidgetsProps) {
  const isGirls = themeMode === 'girls';

  const handleOpenMessenger = (name: string, defaultUrl: string, customUrl?: string) => {
    const finalUrl = customUrl || defaultUrl;
    triggerAlert(`هدایت به کانال رسمی در پیام‌رسان ${name}...`);
    try {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  return (
    <div className="w-full flex justify-center py-2 px-3">
      <div className="w-full max-w-xl grid grid-cols-2 gap-3">
        {/* Eitaa Card */}
        <button
          onClick={() => handleOpenMessenger('ایتا (Eitaa)', 'https://eitaa.com/hisstory_official', siteSettings?.eitaaChannelUrl)}
          title="ایتا"
          className={`group flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border shadow-lg transition-all duration-200 cursor-pointer text-center hover:scale-[1.02] active:scale-[0.98] ${
            isGirls
              ? 'bg-[#1a0822]/90 border-fuchsia-500/30 hover:border-orange-500/50 shadow-[0_0_20px_rgba(255,19,137,0.1)]'
              : 'bg-[#0b132b]/90 border-cyan-500/30 hover:border-orange-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 group-hover:scale-110 transition-transform">
            {siteSettings?.eitaaLogoUrl ? (
              <img src={siteSettings.eitaaLogoUrl} alt="ایتا" className="w-5 h-5 object-contain" />
            ) : (
              <Send size={18} />
            )}
          </div>
          <span className="text-xs sm:text-sm font-black text-white group-hover:text-orange-300 transition-colors">
            {siteSettings?.eitaaBadgeText || 'ایتا'}
          </span>
        </button>

        {/* Bale Card */}
        <button
          onClick={() => handleOpenMessenger('بله (Bale)', 'https://ble.ir/warroom_app', siteSettings?.baleChannelUrl)}
          title="بله"
          className={`group flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border shadow-lg transition-all duration-200 cursor-pointer text-center hover:scale-[1.02] active:scale-[0.98] ${
            isGirls
              ? 'bg-[#1a0822]/90 border-fuchsia-500/30 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(255,19,137,0.1)]'
              : 'bg-[#0b132b]/90 border-cyan-500/30 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
            {siteSettings?.baleLogoUrl ? (
              <img src={siteSettings.baleLogoUrl} alt="بله" className="w-5 h-5 object-contain" />
            ) : (
              <MessageSquare size={18} />
            )}
          </div>
          <span className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
            {siteSettings?.baleBadgeText || 'بله'}
          </span>
        </button>
      </div>
    </div>
  );
}


