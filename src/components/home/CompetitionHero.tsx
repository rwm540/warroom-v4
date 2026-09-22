import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { 
  Swords, 
  ArrowLeft, 
  ClipboardCheck, 
  Sparkles, 
  Play, 
  Image as ImageIcon, 
  ShieldCheck, 
  X, 
  UserPlus, 
  Flame, 
  Users
} from 'lucide-react';

interface CompetitionHeroProps {
  currentUser: User | null;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  siteSettings?: any;
}

export default function CompetitionHero({
  currentUser,
  onPrimaryAction,
  onSecondaryAction,
  siteSettings
}: CompetitionHeroProps) {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);

  useEffect(() => {
    if (showVideoModal || showPosterModal) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [showVideoModal, showPosterModal]);

  return (
    <div className="relative mx-4 my-4 p-5 md:p-6 rounded-3xl cyber-card-3d dir-rtl space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-cyan-500/30" id="competition-hero">
      
      {/* Top Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h2 className="text-sm md:text-base font-black text-white flex items-center gap-2">
            <Sparkles size={18} className="text-cyan-400 animate-pulse" />
            <span>{siteSettings?.heroTitle || 'رویداد ملی مسابقات اتاق جنگ استراتژیک'}</span>
          </h2>
        </div>
        <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/50 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.3)]">
          {siteSettings?.heroProgress || '۷۲٪ ظرفیت'}
        </span>
      </div>

      {/* Futuristic Teaser & Poster Showcase Area */}
      <div className="relative h-44 md:h-56 w-full rounded-2xl overflow-hidden border border-cyan-500/40 group shadow-inner">
        <img 
          src={siteSettings?.heroImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"} 
          alt="پوستر و تیزر رسمی رویداد اتاق جنگ" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/40 to-transparent" />

        {/* Center Play Teaser Button */}
        <div className="absolute inset-0 flex items-center justify-center gap-3">
          <button
            onClick={() => setShowVideoModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-[0_0_30px_rgba(34,211,238,0.8)] backdrop-blur-sm transition transform hover:scale-105 active:scale-95 group/btn"
          >
            <div className="w-6 h-6 rounded-full bg-slate-950 text-cyan-400 flex items-center justify-center">
              <Play size={12} className="fill-cyan-400 ml-0.5" />
            </div>
            <span>مشاهده تیزر رسمی</span>
          </button>

          <button
            onClick={() => setShowPosterModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-400 font-bold text-xs backdrop-blur-sm transition"
          >
            <ImageIcon size={14} className="text-cyan-400" />
            <span>مشاهده پوستر</span>
          </button>
        </div>

        {/* Bottom Bar Info Tag */}
        <div className="absolute bottom-2.5 right-3 left-3 flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-semibold">فراخوان ثبت‌نام مدارس سراسر کشور</span>
          <span className="text-cyan-300 font-mono font-bold">جوایز نفیس + مدال‌های افتخار</span>
        </div>
      </div>

      {/* Digital Countdown Timer */}
      <div className="bg-[#05091a] p-3 rounded-2xl border border-cyan-500/20 text-center space-y-1">
        <div className="text-xs font-bold text-slate-400">مهلت ثبت‌نام و آغاز مأموریت اول:</div>
        <div className="text-xl md:text-3xl font-black text-white font-mono tracking-widest text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]">
          {siteSettings?.heroCountdown || '۰۲:۱۴:۳۹:۱۵'}
        </div>
        <div className="text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase">
          DAYS : HRS : MINS : SECS
        </div>
      </div>

      {/* HUGE PROMINENT REGISTRATION CTA BUTTON */}
      <div className="pt-1">
        <button
          onClick={onPrimaryAction}
          className="w-full relative group overflow-hidden py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:via-orange-400 hover:to-rose-500 text-slate-950 font-black text-sm md:text-base shadow-[0_0_35px_rgba(245,158,11,0.6)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
          id="btn-main-registration-cta"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
            <Flame size={18} className="animate-pulse" />
          </div>
          <span className="tracking-wide">
            {currentUser 
              ? 'ورود به مأموریت‌ها و اتاق جنگ' 
              : 'ثبت‌نام سریع در رویداد و ورود به اتاق جنگ'}
          </span>
          <ArrowLeft size={18} className="group-hover:-translate-x-1.5 transition-transform" />
        </button>
      </div>

      {/* Feature Bullet Strip */}
      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5 bg-[#070b1a] p-2 rounded-xl border border-slate-800">
          <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
          <span>ثبت‌نام انفرادی + کد اختصاصی ۹ رقمی</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#070b1a] p-2 rounded-xl border border-slate-800">
          <Users size={14} className="text-amber-400 shrink-0" />
          <span>تشکیل جوخه با کد دعوت اختصاصی</span>
        </div>
      </div>

      {/* Video Player Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
          <div className="bg-[#080d22] border border-cyan-500/50 rounded-3xl p-4 sm:p-6 max-w-2xl w-full space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.4)] relative my-auto max-h-[85vh] sm:max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-cyan-400 fill-cyan-400" />
                <h3 className="text-sm font-black text-white">تیزر رسمی مسابقات ملی اتاق جنگ</h3>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-1 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Simulated Frame */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-cyan-500/30 flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80" 
                alt="تیزر" 
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-black/40">
                <div className="w-16 h-16 rounded-full bg-cyan-400/90 text-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.8)] animate-pulse">
                  <Play size={28} className="fill-slate-950 ml-1" />
                </div>
                <span className="text-xs font-bold text-cyan-200">پیش‌نمایش ویدیو آماده پخش</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed text-right">
              تیزر مستند معرفی مراحل مسابقات، مأموریت‌های هوش مصنوعی، پدافند غیرعامل و تحلیل سناریوهای استراتژیک دانش‌آموزی.
            </p>

            <button
              onClick={() => {
                setShowVideoModal(false);
                onPrimaryAction();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs shadow-lg transition"
            >
              ثبت‌نام در مسابقه و شروع مأموریت
            </button>
          </div>
        </div>
      )}

      {/* Official Poster Modal */}
      {showPosterModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
          <div className="bg-[#080d22] border border-cyan-500/50 rounded-3xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.4)] relative max-h-[85vh] sm:max-h-[88vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-cyan-400" />
                <h3 className="text-sm font-black text-white">پوستر رسمی رویداد اتاق جنگ</h3>
              </div>
              <button
                onClick={() => setShowPosterModal(false)}
                className="p-1 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30">
              <img 
                src={siteSettings?.heroImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"} 
                alt="پوستر رسمی" 
                className="w-full h-auto object-cover"
              />
            </div>

            <button
              onClick={() => setShowPosterModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              بستن
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

