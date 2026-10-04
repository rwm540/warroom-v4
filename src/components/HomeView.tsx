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
import GameCharacterGuideModal from './common/GameCharacterGuideModal';
import { Shield, Sparkles } from 'lucide-react';

interface HomeViewProps {
  currentUser: User | null;
  groups: Group[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: (mode: 'login' | 'register_individual' | 'register_group') => void;
  onLogout: () => void;
  onOpenSquadModal: () => void;
  onOpenNotifications?: () => void;
  onOpenGamePortal?: () => void;
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
  onOpenGamePortal,
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
    if (currentUser) {
      if (currentUser.role === 'admin') {
        setActiveTab('Admin');
        return;
      }
    }
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
      <div 
        style={{
          fontFamily: siteSettings?.siteFontFamily || undefined,
          color: siteSettings?.siteTextColor || undefined
        }}
        className={`w-full max-w-[500px] md:max-w-6xl min-h-screen md:min-h-0 relative shadow-[0_0_70px_rgba(0,0,0,0.95)] border-x md:border md:rounded-3xl flex flex-col pb-10 md:pb-8 overflow-hidden z-10 transition-colors duration-500 ${
        isGirls 
          ? 'girls-card-surface border-fuchsia-500/35 shadow-[0_0_80px_rgba(255,19,137,0.22)]' 
          : 'boys-card-surface border-blue-500/35 shadow-[0_0_80px_rgba(37,99,235,0.22)]'
      }`}>
        
        <div className="relative z-10 flex-1 flex flex-col">

          {/* Main Landing Content with Clean Performance Rendering */}
          <div className="p-3 sm:p-5 md:p-6 space-y-6 sm:space-y-8">
            
            {/* Dynamic Reorderable Sections from Site Settings */}
            {(siteSettings?.homeSectionsOrder || ['hero', 'timer', 'prizes', 'messengers', 'about', 'footer']).map((secKey: string) => {
              if (secKey === 'hero') {
                return (
                  <section key="sec-hero" aria-label="بخش معرفی مسابقه و بنر ثبت‌نام" className="transform-gpu">
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
                          return;
                        }
                        const hasGame = typeof window !== 'undefined' ? sessionStorage.getItem('warroom_selected_game_id') : null;
                        if (!hasGame && onOpenGamePortal) {
                          onOpenGamePortal();
                          return;
                        }
                        setActiveTab('Journey');
                      }}
                    />
                  </section>
                );
              }

              if (secKey === 'prizes') {
                return (
                  <section key="sec-prizes" aria-label="جوایز و هدایای مسابقه" className="transform-gpu">
                    <PrizesAwardsBanner 
                      themeMode={themeMode}
                      prizes={prizes}
                      siteSettings={siteSettings}
                      onExplorePrizes={() => setActiveTab('RewardsLeaderboard')}
                    />
                  </section>
                );
              }

              if (secKey === 'messengers') {
                return (
                  <section key="sec-messengers" aria-label="شبکه‌های اجتماعی و پیام‌رسان‌های بله و ایتا" className="transform-gpu">
                    <SocialMessengersWidgets 
                      themeMode={themeMode}
                      siteSettings={siteSettings}
                      onOpenStages={() => setActiveTab('Journey')}
                      onOpenGuide={() => setShowGuideModal(true)}
                      triggerAlert={triggerAlert}
                    />
                  </section>
                );
              }

              if (secKey === 'about') {
                return (
                  <section key="sec-about" aria-label="درباره ما" className="transform-gpu">
                    <AboutSection 
                      onOpenMore={() => setActiveTab('About')} 
                      siteSettings={siteSettings}
                    />
                  </section>
                );
              }

              if (secKey === 'timer') {
                return null;
              }

              if (secKey === 'footer') {
                return (
                  <React.Fragment key="sec-footer-wrapper">
                    <section key="sec-footer" aria-label="فوتر و اطلاعات تماس" className="transform-gpu pt-2">
                      <Footer 
                        themeMode={themeMode}
                        siteSettings={siteSettings}
                        onNavigate={(tab) => setActiveTab(tab)}
                        onOpenAbout={() => setActiveTab('About')}
                        triggerAlert={triggerAlert}
                      />
                    </section>
                  </React.Fragment>
                );
              }

              return null;
            })}

          </div>

        </div>

        {/* Notification Panel Drawer */}
        <NotificationPanel 
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          announcements={announcements}
        />

        {/* Game Character Guide Modal - Exactly matching Clash of Clans tutorial with speech bubble & no box frame */}
        <GameCharacterGuideModal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
          onAction={() => {
            setShowGuideModal(false);
            setActiveTab('Journey');
          }}
          themeMode={themeMode}
          siteSettings={siteSettings}
          actionText="ورود به نقشه مراحل"
        />

      </div>

    </div>
  );
}
