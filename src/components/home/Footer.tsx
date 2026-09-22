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
  CheckCircle2,
  Lock
} from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string) => void;
  onOpenAbout: () => void;
  themeMode?: 'girls' | 'boys';
  triggerAlert?: (msg: string) => void;
}

export default function Footer({ onNavigate, onOpenAbout, themeMode = 'boys', triggerAlert }: FooterProps) {
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
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${
                  isGirls 
                    ? 'bg-fuchsia-950/80 border-fuchsia-500/40 text-fuchsia-400' 
                    : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
                }`}>
                  <Shield size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">سامانه ملی «اتاق جنگ»</h3>
                  <p className={`text-xs font-bold ${isGirls ? 'text-fuchsia-300' : 'text-cyan-400'}`}>
                    سامانه استراتژیک و ارزیابی اتاق جنگ
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl text-justify">
                تنها سامانه رسمی ارزیابی، مسابقه و آموزش‌های استراتژیک دانش‌آموزی کشور تحت نظارت قرارگاه مرکزی. این مجموعه با هدف توانمندسازی فکری، تفکر تفکیکی و ارتقای آمادگی نخبگان نوجوان فعالیت می‌کند.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => onNavigate('About')}
                className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition cursor-pointer"
              >
                <Info size={15} />
                <span>درباره ما</span>
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => onNavigate('Rules')}
                className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 transition cursor-pointer"
              >
                <Shield size={15} />
                <span>قوانین و مقررات</span>
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => onNavigate('Contact')}
                className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 transition cursor-pointer"
              >
                <Phone size={15} />
                <span>پشتیبانی و ثبت تیکت</span>
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
                  <strong className="text-amber-300 font-mono tracking-wider">021-88997766</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400 shrink-0" />
                  <span>ساعات پاسخگویی: </span>
                  <span className="text-slate-200">شنبه تا چهارشنبه ۸:۰۰ الی ۱۶:۰۰</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-emerald-400 shrink-0" />
                  <span>پست الکترونیکی: </span>
                  <span className="text-slate-200 font-mono">support@warroom.ir</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 leading-relaxed">
                    نشانی: تهران، خیابان آزادی، مرکز فناوری و نوآوری‌های استراتژیک، پلاک ۱۱۰
                  </span>
                </li>
              </ul>
            </div>

            {/* 24/7 Support Ticket Button */}
            <button
              type="button"
              onClick={() => {
                onNavigate('Contact');
                triggerAlert?.('ورود به بخش پشتیبانی آنلاین ۲۴/۷');
              }}
              className={`w-full py-2.5 sm:py-3 rounded-xl font-black text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                isGirls
                  ? 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-fuchsia-900/40'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/40'
              }`}
            >
              <MessageCircle size={16} />
              <span>ارسال تیکت پشتیبانی آنلاین ۲۴/۷</span>
            </button>
          </div>

        </div>
      </div>

      {/* Trust Badges & Copyright Section */}
      <div className="space-y-4 text-center">
        
        {/* Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          
          {/* ZarinPal Badge */}
          <div className="px-4 py-2 rounded-2xl bg-[#080d21]/90 border border-cyan-500/30 flex items-center gap-2.5 text-right shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <div className="text-[11px] font-black text-white">درگاه پرداخت زرین‌پال</div>
              <div className="text-[9px] text-cyan-400 font-bold">پرداخت ایمن ۲۵۶ بیتی</div>
            </div>
          </div>

          {/* Enamad Badge */}
          <div className="px-4 py-2 rounded-2xl bg-[#080d21]/90 border border-amber-500/30 flex items-center gap-2.5 text-right shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-[11px] font-black text-white">نماد اعتماد الکترونیکی</div>
              <div className="text-[9px] text-amber-400 font-bold">وزارت صنعت، معدن و تجارت</div>
            </div>
          </div>

        </div>

        {/* Copyright Text */}
        <div className="space-y-1 text-[11px] text-slate-400 leading-relaxed">
          <p className="font-bold text-slate-300">
            © ۱۴۰۳ تمامی حقوق مادی و معنوی متعلق به قرارگاه مرکزی مسابقات استراتژیک «اتاق جنگ» می‌باشد.
          </p>
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5 dir-ltr">
            <Lock size={12} className="text-cyan-500" />
            <span>طراحی و توسعه یافته با استاندارد امنیتی AES-256 و پروتکل TLS 1.3</span>
          </p>
        </div>

      </div>

    </footer>
  );
}
