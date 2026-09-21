import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Group, PrizeItem } from '../types';
import { 
  initialHomeAnnouncements, 
  homeStatsData, 
  faqsData, 
  HomeAnnouncement,
  HomeStats,
  FaqItem
} from '../data/home';

import NotificationPanel from './home/NotificationPanel';
import AdventureHeroSection from './home/AdventureHeroSection';
import PrizesAwardsBanner from './home/PrizesAwardsBanner';
import SocialMessengersWidgets from './home/SocialMessengersWidgets';
import AboutSection from './home/AboutSection';
import StatsStrip from './home/StatsStrip';
import FaqAccordion from './home/FaqAccordion';
import Footer from './home/Footer';
import { Shield, BookOpen, Sparkles, X, CheckCircle, Gem, Trophy, ChevronLeft } from 'lucide-react';

interface HomeViewProps {
  currentUser: User | null;
  groups: Group[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: (mode: 'login' | 'register_individual' | 'register_group') => void;
  onLogout: () => void;
  onOpenSquadModal: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  triggerAlert: (msg: string) => void;
  siteSettings?: any;
  homeAnnouncements?: HomeAnnouncement[];
  homeStats?: HomeStats;
  faqs?: FaqItem[];
  prizes?: PrizeItem[];
  campaignTheme?: 'girls' | 'boys';
  onChangeCampaign?: (targetTheme?: 'girls' | 'boys') => void;
}

export default function HomeView({
  currentUser,
  groups,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  onOpenSquadModal,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  triggerAlert,
  siteSettings,
  homeAnnouncements,
  homeStats,
  faqs,
  prizes = [],
  campaignTheme = 'boys',
  onChangeCampaign
}: HomeViewProps) {
  // Theme Switching State: 'girls' (feminine pastel/pink) vs 'boys' (masculine cyan/blue/amber)
  const [themeMode, setThemeMode] = useState<'girls' | 'boys'>(() => {
    if (campaignTheme) return campaignTheme;
    if (currentUser?.gender === 'دختر') return 'girls';
    const saved = localStorage.getItem('hisstory_theme_mode');
    return (saved === 'girls' || saved === 'boys') ? saved : 'boys';
  });

  useEffect(() => {
    if (campaignTheme) {
      setThemeMode(campaignTheme);
    }
  }, [campaignTheme]);

  const handleThemeChange = (mode: 'girls' | 'boys') => {
    setThemeMode(mode);
    localStorage.setItem('hisstory_theme_mode', mode);
    triggerAlert(mode === 'girls' ? 'پوسته ویژه دختران فعال شد.' : 'پوسته ویژه پسران فعال شد.');
  };

  // Notification Panel Drawer state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<HomeAnnouncement[]>(() => {
    return homeAnnouncements || initialHomeAnnouncements;
  });

  // Modal states
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (showGuideModal) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowGuideModal(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showGuideModal]);

  // Keep state updated if props change
  useEffect(() => {
    if (homeAnnouncements) {
      setAnnouncements(homeAnnouncements);
    }
  }, [homeAnnouncements]);

  const isGirls = themeMode === 'girls';

  const handleStartMission = () => {
    setActiveTab('Journey');
  };

  return (
    <div className={`w-full min-h-screen transition-colors duration-700 font-sans p-0 md:p-4 lg:p-6 flex justify-center ${
      isGirls ? 'girls-atmosphere-bg text-pink-50' : 'boys-atmosphere-bg text-slate-100'
    }`}>
      
      {/* Dynamic Background Ambient Aura - GPU Accelerated */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu">
        {isGirls ? (
          <>
            <div className="absolute top-0 inset-x-0 h-[35vh] bg-gradient-to-b from-[#020005] via-[#090112]/70 to-transparent" />
            <div className="absolute -bottom-24 -left-20 w-[450px] h-[450px] blur-[50px] rounded-full bg-[radial-gradient(circle,rgba(255,19,137,0.25)_0%,transparent_70%)] transform-gpu" />
            <div className="absolute -bottom-24 -right-20 w-[500px] h-[500px] blur-[55px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.28)_0%,transparent_70%)] transform-gpu" />
          </>
        ) : (
          <>
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-[#010206] via-[#020512]/60 to-transparent" />
            <div className="absolute -bottom-24 -left-20 w-[450px] h-[450px] blur-[50px] rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.25)_0%,transparent_70%)] transform-gpu" />
            <div className="absolute -bottom-24 -right-20 w-[500px] h-[500px] blur-[55px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.28)_0%,transparent_70%)] transform-gpu" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />
          </>
        )}
      </div>

      {/* Responsive Container: Mobile-Optimized + Full Desktop Experience */}
      <div className={`w-full max-w-[500px] md:max-w-6xl min-h-screen md:min-h-0 relative shadow-[0_0_70px_rgba(0,0,0,0.95)] border-x md:border md:rounded-3xl flex flex-col pb-10 md:pb-8 overflow-hidden z-10 transition-colors duration-500 ${
        isGirls 
          ? 'girls-card-surface border-fuchsia-500/35 shadow-[0_0_80px_rgba(255,19,137,0.22)]' 
          : 'boys-card-surface border-blue-500/35 shadow-[0_0_80px_rgba(37,99,235,0.22)]'
      }`}>
        
        <div className="relative z-10 flex-1 flex flex-col">

          {/* Main Landing Content with Clean Performance Rendering */}
          <div className="p-3 sm:p-5 md:p-6 space-y-6 sm:space-y-8">
            
            {/* 1. Adventure Hero Section - Instant Render (No Scroll Waiting) */}
            <section 
              aria-label="بخش معرفی مسابقه و بنر ثبت‌نام"
              className="transform-gpu"
            >
              <AdventureHeroSection 
                themeMode={themeMode}
                currentUser={currentUser}
                siteSettings={siteSettings}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenRegister={() => onOpenAuth('register_individual')}
                onSelectTheme={(targetTheme) => {
                  if (onChangeCampaign) {
                    onChangeCampaign(targetTheme);
                  }
                }}
                onGoToDashboard={() => {
                  if (currentUser?.role === 'admin') {
                    setActiveTab('Admin');
                  } else {
                    setActiveTab('Dashboard');
                  }
                  if (currentUser) {
                    triggerAlert(`ورود مستقیم به پنل: ${currentUser.first_name} ${currentUser.last_name}`);
                  }
                }}
              />
            </section>

            {/* 2. Dedicated Banner for Prizes & Awards - Instant Render */}
            <section 
              aria-label="جوایز و هدایای مسابقه"
              className="transform-gpu"
            >
              <PrizesAwardsBanner 
                themeMode={themeMode}
                prizes={prizes}
                onExplorePrizes={() => setActiveTab('RewardsLeaderboard')}
              />
            </section>

            {/* 3. Social Media Widgets: Local Messengers + Stages & Guide */}
            <section 
              aria-label="شبکه‌های اجتماعی و پیام‌رسان‌های بله و ایتا"
              className="transform-gpu"
            >
              <SocialMessengersWidgets 
                themeMode={themeMode}
                onOpenStages={() => setActiveTab('Journey')}
                onOpenGuide={() => setShowGuideModal(true)}
                triggerAlert={triggerAlert}
              />
            </section>

            {/* 4. About Us Section */}
            <section 
              aria-label="درباره ما"
              className="transform-gpu"
            >
              <AboutSection onOpenMore={() => setActiveTab('About')} />
            </section>

            {/* 5. Footer Section */}
            <section 
              aria-label="فوتر و اطلاعات تماس"
              className="transform-gpu pt-2"
            >
              <Footer 
                themeMode={themeMode}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenAbout={() => setActiveTab('About')}
                triggerAlert={triggerAlert}
              />
            </section>

          </div>

        </div>

        {/* Notification Panel Drawer */}
        <NotificationPanel 
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          announcements={announcements}
        />

        {/* Competition Guide & Rules Modal - Portal into document.body for guaranteed fixed viewport centering */}
        {showGuideModal && typeof document !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 dir-rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-modal-title"
          >
            {/* Backdrop with smooth blur and click-to-close */}
            <div 
              className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer transition-opacity"
              onClick={() => setShowGuideModal(false)}
            />

            {/* Modal Card - Centered, standard width, no redundant nested scrollbars */}
            <div 
              className={`relative z-10 w-full max-w-lg rounded-3xl p-5 sm:p-6 text-right border shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 ${
                isGirls 
                  ? 'bg-[#16081d] border-pink-500/40 shadow-[0_0_50px_rgba(255,19,137,0.25)] text-pink-50' 
                  : 'bg-[#0b1224] border-blue-500/40 shadow-[0_0_50px_rgba(37,99,235,0.25)] text-slate-100'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl shrink-0 ${
                    isGirls 
                      ? 'bg-pink-950/80 text-pink-400 border border-pink-700/50 shadow-md' 
                      : 'bg-blue-950/80 text-blue-400 border border-blue-700/50 shadow-md'
                  }`}>
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <h3 id="guide-modal-title" className="text-base sm:text-lg font-black text-white leading-tight">
                      راهنما و قوانین ماجراجویی اتاق جنگ
                    </h3>
                    <p className={`text-xs font-semibold mt-0.5 ${isGirls ? 'text-pink-300' : 'text-blue-300'}`}>
                      پرونده بزرگ هفت‌خوان
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500 transition cursor-pointer"
                  title="بستن پنجره"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 3 Main Rules / Guidance Cards - High contrast, legible typography */}
              <div className="space-y-3 text-xs leading-relaxed">
                <div className={`p-3.5 sm:p-4 rounded-2xl space-y-1.5 border ${
                  isGirls ? 'bg-slate-900/70 border-pink-900/30' : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    <strong className="text-white text-xs sm:text-sm font-black">۱. ساختار هفت مرحله مسابقه:</strong>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed pr-6">
                    مسابقه شامل ۷ مرحله داستانی به سبک کارآگاهی است. با اتمام هر مرحله کریستال‌های امتیاز آزاد شده و مرحله بعدی باز می‌شود.
                  </p>
                </div>

                <div className={`p-3.5 sm:p-4 rounded-2xl space-y-1.5 border ${
                  isGirls ? 'bg-slate-900/70 border-pink-900/30' : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <Gem size={16} className={isGirls ? 'text-pink-400 shrink-0' : 'text-cyan-400 shrink-0'} />
                    <strong className="text-white text-xs sm:text-sm font-black">۲. کریستال‌ها و رده‌بندی:</strong>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed pr-6">
                    کریستال‌ها بر اساس دقت در پاسخ، حل چالش‌ها و سرعت عمل تعلق می‌گیرد. برترین‌های کشور و استان مشمول جوایز ۵۰ میلیارد ریالی خواهند شد.
                  </p>
                </div>

                <div className={`p-3.5 sm:p-4 rounded-2xl space-y-1.5 border ${
                  isGirls ? 'bg-slate-900/70 border-pink-900/30' : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400 shrink-0" />
                    <strong className="text-white text-xs sm:text-sm font-black">۳. جوایز و کدهای تخفیف:</strong>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed pr-6">
                    علاوه بر کنسول‌های بازی، تبلت و تلفن هوشمند، بیش از ۱۰۰ هزار کد تخفیف فروشگاهی به کلیه شرکت‌کنندگان اهدا می‌گردد.
                  </p>
                </div>
              </div>

              {/* Action Button - Standard, crisp & responsive */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowGuideModal(false);
                    setActiveTab('Journey');
                  }}
                  className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    isGirls 
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-900/40 hover:shadow-pink-900/60 active:scale-[0.99]' 
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-900/40 hover:shadow-blue-900/60 active:scale-[0.99]'
                  }`}
                >
                  <span>ورود به نقشه مراحل مسابقه</span>
                  <ChevronLeft size={16} />
                </button>
              </div>

            </div>
          </div>,
          document.body
        )}

      </div>

    </div>
  );
}
