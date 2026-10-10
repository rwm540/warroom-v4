import React from 'react';
import { 
  Shield, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Info, 
  CreditCard, 
  MessageCircle, 
  Headphones, 
  CheckCircle2 
} from 'lucide-react';
import { EnamadBadge } from '../common/EnamadBadge';

interface FooterProps {
  onNavigate: (tab: string) => void;
  onOpenAbout: () => void;
  themeMode?: 'girls' | 'boys';
  siteSettings?: any;
  triggerAlert?: (msg: string) => void;
}

export default function Footer({ onNavigate, onOpenAbout, themeMode = 'boys', siteSettings, triggerAlert }: FooterProps) {
  const isGirls = themeMode === 'girls';

  return (
    <footer className="w-full space-y-6 dir-rtl font-sans pt-4 pb-2">
      
      {/* Main Footer Card */}
      <div className={`rounded-3xl p-5 sm:p-7 border shadow-2xl relative overflow-hidden transition-all duration-500 ${
        isGirls 
          ? 'bg-[#150718]/95 border-fuchsia-500/30 shadow-[0_0_40px_rgba(255,19,137,0.15)]' 
          : 'bg-[#080d21]/95 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]'
      }`}>
        
        {/* Subtle Background Glow */}
        <div className={`absolute -right-20 -bottom-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isGirls ? 'bg-fuchsia-500/10' : 'bg-cyan-500/10'
        }`} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          
          {/* Right Column: About System & Intro */}
          <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 flex items-center justify-center shrink-0 overflow-hidden bg-transparent border-0 shadow-none">
                  {siteSettings?.footerLogoIconUrl || siteSettings?.customLogoUrl ? (
                    <img 
                      src={siteSettings.footerLogoIconUrl || siteSettings.customLogoUrl} 
                      alt="لوگوی فوتر" 
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <Shield size={26} className={`animate-pulse ${isGirls ? 'text-fuchsia-400' : 'text-cyan-400'}`} />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {siteSettings?.footerTitle || 'سامانه ملی «اتاق جنگ»'}
                  </h3>
                  <p className={`text-xs font-bold ${isGirls ? 'text-fuchsia-300' : 'text-cyan-400'}`}>
                    {siteSettings?.footerSubtitle || 'سامانه استراتژیک و ارزیابی اتاق جنگ'}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl text-justify">
                {siteSettings?.footerAboutText || 'تنها سامانه رسمی ارزیابی، مسابقه و آموزش‌های استراتژیک دانش‌آموزی کشور تحت نظارت قرارگاه مرکزی. این مجموعه با هدف توانمندسازی فکری، تفکر تفکیکی و ارتقای آمادگی نخبگان نوجوان فعالیت می‌کند.'}
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => onNavigate('Rules')}
                className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 transition cursor-pointer"
              >
                <Shield size={15} />
                <span>قوانین و مقررات</span>
              </button>
            </div>
          </div>

          {/* Left Column: Contact & Secretariat */}
          <div className="lg:col-span-5 space-y-3.5 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2 mb-3">
                <Headphones size={16} className={isGirls ? 'text-fuchsia-400' : 'text-cyan-400'} />
                <span>ارتباط با دبیرخانه و پشتیبانی</span>
              </h4>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-amber-400 shrink-0" />
                  <span>تلفن پشتیبانی: </span>
                  <strong className="text-amber-300 font-mono tracking-wider">
                    {siteSettings?.footerPhone || siteSettings?.contactPhone || '021-88997766'}
                  </strong>
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400 shrink-0" />
                  <span>ساعات پاسخگویی: </span>
                  <span className="text-slate-200">
                    {siteSettings?.footerHours || 'شنبه تا چهارشنبه ۸:۰۰ الی ۱۶:۰۰'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-emerald-400 shrink-0" />
                  <span>پست الکترونیکی: </span>
                  <span className="text-slate-200 font-mono">
                    {siteSettings?.footerEmail || siteSettings?.contactEmail || 'support@warroom.ir'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 leading-relaxed">
                    {siteSettings?.footerAddress || siteSettings?.address || 'نشانی: تهران، خیابان آزادی، مرکز فناوری و نوآوری‌های استراتژیک، پلاک ۱۱۰'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Trust Badges & Copyright Section */}
      <div className="space-y-4 text-center">
        
        {/* Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          
          {/* Payment Gateways (Strictly Icon Only, No border/background) */}
          {Array.isArray(siteSettings?.paymentGateways) && siteSettings.paymentGateways.length > 0 ? (
            siteSettings.paymentGateways.filter((g: any) => g.isActive !== false).map((gateway: any) => (
              gateway.linkUrl ? (
                <a
                  key={gateway.id}
                  href={gateway.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerAlert?.('هدایت به درگاه پرداخت رسمی...')}
                  className="inline-flex items-center justify-center bg-transparent border-none shadow-none no-underline hover:scale-105 transition-transform cursor-pointer"
                  title="درگاه پرداخت امن"
                >
                  {gateway.iconUrl ? (
                    <img src={gateway.iconUrl} alt="درگاه پرداخت" className="max-h-12 w-auto object-contain bg-transparent border-none shadow-none" />
                  ) : (
                    <CreditCard size={28} className="text-cyan-400" />
                  )}
                </a>
              ) : (
                <div
                  key={gateway.id}
                  className="inline-flex items-center justify-center bg-transparent border-none shadow-none"
                  title="درگاه پرداخت امن"
                >
                  {gateway.iconUrl ? (
                    <img src={gateway.iconUrl} alt="درگاه پرداخت" className="max-h-12 w-auto object-contain bg-transparent border-none shadow-none" />
                  ) : (
                    <CreditCard size={28} className="text-cyan-400" />
                  )}
                </div>
              )
            ))
          ) : (siteSettings?.gatewayIconUrl || siteSettings?.gatewayTitle) && (
            <a
              href={siteSettings?.gatewayLinkUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerAlert?.('هدایت به درگاه پرداخت...')}
              className="inline-flex items-center justify-center bg-transparent border-none shadow-none no-underline hover:scale-105 transition-transform cursor-pointer"
              title="درگاه پرداخت"
            >
              {siteSettings?.gatewayIconUrl ? (
                <img src={siteSettings.gatewayIconUrl} alt="درگاه" className="max-h-12 w-auto object-contain bg-transparent border-none shadow-none" />
              ) : (
                <CreditCard size={28} className="text-cyan-400" />
              )}
            </a>
          )}

          {/* eNAMAD / Trust Seals (Strictly Icon Only, No border/background) */}
          {Array.isArray(siteSettings?.enamadBadges) && siteSettings.enamadBadges.length > 0 ? (
            siteSettings.enamadBadges.filter((e: any) => e.isActive !== false).map((enamad: any) => (
              enamad.htmlCode ? (
                <div
                  key={enamad.id}
                  className="inline-flex items-center justify-center bg-transparent border-none shadow-none [&_a]:inline-block [&_a]:cursor-pointer [&_a]:bg-transparent [&_a]:border-none [&_img]:max-h-14 [&_img]:w-auto [&_img]:object-contain [&_img]:border-none [&_img]:bg-transparent"
                  dangerouslySetInnerHTML={{ __html: enamad.htmlCode }}
                />
              ) : enamad.linkUrl ? (
                <a
                  key={enamad.id}
                  href={enamad.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerAlert?.('هدایت به نماد اعتماد...')}
                  className="inline-flex items-center justify-center bg-transparent border-none shadow-none no-underline hover:scale-105 transition-transform cursor-pointer"
                  title="نماد اعتماد الکترونیکی"
                >
                  {enamad.iconUrl ? (
                    <img src={enamad.iconUrl} alt="اینماد" className="max-h-14 w-auto object-contain bg-transparent border-none shadow-none" />
                  ) : (
                    <CheckCircle2 size={28} className="text-amber-400" />
                  )}
                </a>
              ) : (
                <div
                  key={enamad.id}
                  className="inline-flex items-center justify-center bg-transparent border-none shadow-none"
                  title="نماد اعتماد الکترونیکی"
                >
                  {enamad.iconUrl ? (
                    <img src={enamad.iconUrl} alt="اینماد" className="max-h-14 w-auto object-contain bg-transparent border-none shadow-none" />
                  ) : (
                    <CheckCircle2 size={28} className="text-amber-400" />
                  )}
                </div>
              )
            ))
          ) : siteSettings?.enamadEnabled !== false && (
            <EnamadBadge 
              htmlCode={siteSettings?.enamadHtmlCode} 
              enabled={true} 
            />
          )}

          {/* Additional Custom Badges */}
          {Array.isArray(siteSettings?.customFooterBadges) && siteSettings.customFooterBadges.filter((b: any) => b.isActive !== false).map((badge: any) => (
            badge.linkUrl ? (
              <a
                key={badge.id}
                href={badge.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerAlert?.(`هدایت به ${badge.title}...`)}
                className="px-4 py-2 rounded-2xl bg-[#080d21]/90 border border-purple-500/30 hover:border-purple-400 flex items-center gap-2.5 text-right shadow-lg transition-all hover:scale-105 active:scale-95 group cursor-pointer no-underline"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 group-hover:border-purple-400 text-purple-400 flex items-center justify-center shrink-0 overflow-hidden">
                  {badge.iconUrl ? (
                    <img src={badge.iconUrl} alt={badge.title} className="w-full h-full object-contain" />
                  ) : (
                    <Shield size={18} />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-black text-white group-hover:text-purple-300 transition-colors">
                    {badge.title}
                  </div>
                  {badge.subtitle && (
                    <div className="text-[9px] text-purple-400 font-bold">
                      {badge.subtitle}
                    </div>
                  )}
                </div>
              </a>
            ) : (
              <div
                key={badge.id}
                className="px-4 py-2 rounded-2xl bg-[#080d21]/90 border border-purple-500/30 flex items-center gap-2.5 text-right shadow-lg transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 overflow-hidden">
                  {badge.iconUrl ? (
                    <img src={badge.iconUrl} alt={badge.title} className="w-full h-full object-contain" />
                  ) : (
                    <Shield size={18} />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-black text-white">
                    {badge.title}
                  </div>
                  {badge.subtitle && (
                    <div className="text-[9px] text-purple-400 font-bold">
                      {badge.subtitle}
                    </div>
                  )}
                </div>
              </div>
            )
          ))}

        </div>

      </div>

    </footer>
  );
}
