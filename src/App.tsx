import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ShieldAlert, X, Radio, MessageSquare } from 'lucide-react';

// Types
import { 
  User, 
  Group, 
  Mission, 
  MissionSubmission, 
  Training, 
  Medal, 
  UserMedal, 
  SupportTicket, 
  SupportReply, 
  Announcement, 
  News,
  AppNotification,
  GamePortal,
  PasswordResetRequest,
  JourneyStage,
  DailyChallengeConfig,
  PrizeItem,
  PaymentSettings,
  PaymentTransaction,
  GroupJoinRequest
} from './types';
import { initialJourneyStages, initialDailyChallengeConfig } from './data/initialStages';

// Mock Data
import { 
  initialUsers, 
  initialGroups, 
  initialMissions, 
  initialSubmissions, 
  initialTrainings, 
  initialMedals, 
  initialUserMedals, 
  initialSupportTickets, 
  initialSupportReplies, 
  initialAnnouncements, 
  initialNews,
  initialNotifications 
} from './data';
import { injectCustomFontFace, injectCustomFontCssUrl } from './utils/dynamicFonts';

import {
  initialHomeAnnouncements, 
  homeStatsData, 
  faqsData, 
  defaultHomeButtons,
  defaultHomeBlocks,
  HomeAnnouncement, 
  HomeStats, 
  FaqItem 
} from './data/home';

import { supabase, isSupabaseEnabled } from './lib/supabaseClient';
// Supabase Data Sync Layer (falls back to localStorage automatically)
import {
  useSyncedCollection,
  useSyncedSetting,
  persistSavedPostsToDb,
  loadSavedPostsFromDb,
  saveUserProgressToSupabase,
  checkSupabaseHealth
} from './lib/supabaseData';
// 🛡️ لایه ارتباط امن با بک‌اند (احراز هویت، رمز عبور، درخواست‌های تغییر رمز)
import { probeBackend, apiLogout, apiSession, getBackendStatus, subscribeBackendStatus } from './lib/backendApi';
import { installGlobalErrorAudit, logAudit } from './lib/auditLogger';

// Vitrin (Showcase) data layer
import { getAllDailyChallenges } from './lib/dailyChallengeService';
import {
  VitrinPost,
  VitrinComment,
  getVitrinPostsFromStore,
  getAllVitrinComments
} from './data/vitrinData';
import { DEFAULT_GAME_PORTALS } from './data/portalData';

// Static Base Views (Needed for immediate FCP & LCP)
import HomeView from './components/HomeView.tsx';
import Navbar from './components/Navbar.tsx';
import BottomNavigation from './components/home/BottomNavigation.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';
import BackgroundMusic from './components/BackgroundMusic.tsx';
import PersistentMusicBar from './components/PersistentMusicBar.tsx';
import LiveNotificationToast from './components/LiveNotificationToast.tsx';
import InternalDialogHost from './components/InternalDialogHost.tsx';
import RadarLoading from './components/RadarLoading.tsx';
import GroupChatPanel from './components/GroupChatPanel.tsx';
import { OfflineSyncBanner } from './components/OfflineSyncBanner.tsx';

import { lazyWithRetry } from './utils/lazyWithRetry';

// Code-Split Dynamic Views & Modals (loaded on-demand with offline recovery)
const AuthView = lazyWithRetry(() => import('./components/AuthView.tsx'));
const DashboardView = lazyWithRetry(() => import('./components/DashboardView.tsx'));
const JourneyView = lazyWithRetry(() => import('./components/JourneyView.tsx'));
const MissionsView = lazyWithRetry(() => import('./components/MissionsView.tsx'));
const TrainingsView = lazyWithRetry(() => import('./components/TrainingsView.tsx'));
const SupportView = lazyWithRetry(() => import('./components/SupportView.tsx'));
const ContactView = lazyWithRetry(() => import('./components/ContactView.tsx'));
const AboutView = lazyWithRetry(() => import('./components/AboutView.tsx'));
const RulesView = lazyWithRetry(() => import('./components/RulesView.tsx'));
const ProfileView = lazyWithRetry(() => import('./components/ProfileView.tsx'));
const PrizesPointsView = lazyWithRetry(() => import('./components/PrizesPointsView.tsx'));
const VitrinView = lazyWithRetry(() => import('./components/VitrinView.tsx'));
const WalletTransfersView = lazyWithRetry(() => import('./components/WalletTransfersView.tsx'));
const SquadManagementModal = lazyWithRetry(() => import('./components/SquadManagementModal.tsx'));
const ProfileModal = lazyWithRetry(() => import('./components/ProfileModal.tsx'));
const GameSelectionPortalModal = lazyWithRetry(() => import('./components/GameSelectionPortalModal.tsx'));
const NotificationCenterModal = lazyWithRetry(() => import('./components/NotificationCenterModal.tsx'));
const OnboardingCommanderTutorial = lazyWithRetry(() => import('./components/OnboardingCommanderTutorial.tsx'));
const ForcePasswordChangeModal = lazyWithRetry(() => import('./components/ForcePasswordChangeModal.tsx'));
const AdminPanel = lazyWithRetry(() => import('./components/AdminPanel.tsx'));
import { GuideTutorialConfig, defaultGuideConfig } from './components/AdminGuideTutorialManager';

// Highly optimized Draggable Floating Chat Button component
const DraggableFloatingChatButton = React.memo(function DraggableFloatingChatButton({
  isGirlsTheme,
  onToggle
}: {
  isGirlsTheme: boolean;
  onToggle: () => void;
}) {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('warroom_floating_chat_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { x: 0, y: 0 };
  });

  return (
    <motion.button
      drag
      dragMomentum={false}
      dragElastic={0.1}
      animate={{ x: position.x, y: position.y }}
      onDragEnd={(_, info) => {
        const dist = Math.hypot(info.offset.x, info.offset.y);
        if (dist < 6) {
          onToggle();
          return;
        }
        const newPos = {
          x: position.x + info.offset.x,
          y: position.y + info.offset.y
        };
        setPosition(newPos);
        try {
          localStorage.setItem('warroom_floating_chat_pos', JSON.stringify(newPos));
        } catch (e) {}
      }}
      initial={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{ touchAction: 'none' }}
      className={`fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs border cursor-grab active:cursor-grabbing select-none backdrop-blur-md transition-shadow ${
        isGirlsTheme
          ? 'bg-gradient-to-r from-fuchsia-600/90 to-purple-600/90 text-white border-pink-400/50 shadow-[0_0_25px_rgba(255,19,137,0.5)]'
          : 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white border-blue-400/50 shadow-[0_0_25px_rgba(37,99,235,0.5)]'
      }`}
      title="نمایش اتاق گفتگو و چت روم (با ۱ کلیک سریع باز می‌شود)"
    >
      <div className="relative">
        <MessageSquare size={18} />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      </div>
      <span>اتاق گفتگو</span>
    </motion.button>
  );
});

// Preload common chunks on idle / hover
export function prefetchViewChunk(name: string) {
  switch (name) {
    case 'Auth': void import('./components/AuthView.tsx'); break;
    case 'Dashboard': void import('./components/DashboardView.tsx'); break;
    case 'Journey': void import('./components/JourneyView.tsx'); break;
    case 'Missions': void import('./components/MissionsView.tsx'); break;
    case 'Trainings': void import('./components/TrainingsView.tsx'); break;
    case 'Vitrin': void import('./components/VitrinView.tsx'); break;
    case 'Prizes': case 'Rewards': void import('./components/PrizesPointsView.tsx'); break;
    case 'Support': case 'Contact': void import('./components/ContactView.tsx'); void import('./components/SupportView.tsx'); break;
    case 'About': void import('./components/AboutView.tsx'); break;
    case 'Rules': void import('./components/RulesView.tsx'); break;
    case 'Profile': void import('./components/ProfileView.tsx'); break;
    case 'Admin': void import('./components/AdminPanel.tsx'); break;
  }
}

const ViewFallback = () => (
  <div className="w-full min-h-[300px] py-12 flex flex-col items-center justify-center text-center font-sans dir-rtl">
    <RadarLoading 
      size="sm" 
      label="در حال پایش راداری و پردازش..." 
      subLabel="سامانه اتاق جنگ" 
    />
  </div>
);

class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[WarRoom Admin] خطای render در پنل ادمین:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] rounded-3xl border border-rose-500/40 bg-[#090d1f]/90 p-6 text-center text-slate-100 dir-rtl shadow-[0_0_25px_rgba(244,63,94,0.12)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/50 bg-rose-950/40 text-rose-300">
            <ShieldAlert size={26} />
          </div>
          <h3 className="text-lg font-black text-white">پنل مدیریت به‌روزرسانی شد</h3>
          <p className="mt-2 text-sm text-slate-300 leading-7">
            در این بخش خطایی رخ داده است و برای حفظ تجربهٔ کاربری، نمایش پنل به حالت امن بازگشت داده شد.
          </p>
          <button
            type="button"
            onClick={this.props.onReset}
            className="mt-5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 transition"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    const uninstallErrorAudit = installGlobalErrorAudit();
    void logAudit({
      event: 'app.started',
      level: 'info',
      source: 'client',
      route: window.location.pathname,
      metadata: { userAgent: navigator.userAgent.slice(0, 240) },
    });
    return uninstallErrorAudit;
  }, []);

  // ============================================================================
  // Global Data State — کاملاً همگام با Supabase
  // هر مجموعه‌ای که از useSyncedCollection ساخته می‌شود، پس از بارگذاری
  // اولیه از دیتابیس، هر تغییر آن را به‌صورت خودکار (Upsert/Delete)
  // در جدول متناظر Supabase ذخیره می‌کند. در نبود Supabase، localStorage
  // به‌عنوان منبع ذخیره‌سازی استفاده می‌شود (بدون تغییر رفتار قبلی).
  // ============================================================================
  const [users, setUsers] = useSyncedCollection<User>({
    table: 'warroom_users',
    initial: []
  });

  const [groups, setGroups] = useSyncedCollection<Group>({
    storageKey: 'warroom_groups',
    table: 'warroom_groups',
    initial: []
  });

  const [groupJoinRequests, setGroupJoinRequests] = useSyncedCollection<GroupJoinRequest>({
    storageKey: 'warroom_group_join_requests',
    table: 'warroom_group_join_requests',
    initial: []
  });

  const [missions, setMissions] = useSyncedCollection<Mission>({
    storageKey: 'warroom_missions',
    table: 'warroom_missions',
    initial: []
  });

  const [submissions, setSubmissions] = useSyncedCollection<MissionSubmission>({
    storageKey: 'warroom_submissions',
    table: 'warroom_submissions',
    initial: []
  });

  const [trainings, setTrainings] = useSyncedCollection<Training>({
    storageKey: 'warroom_trainings',
    table: 'warroom_trainings',
    initial: []
  });

  const [medals, setMedals] = useSyncedCollection<Medal>({
    storageKey: 'warroom_medals',
    table: 'warroom_medals',
    initial: []
  });

  const [userMedals, setUserMedals] = useSyncedCollection<UserMedal>({
    storageKey: 'warroom_user_medals',
    table: 'warroom_user_medals',
    initial: []
  });

  const [tickets, setTickets] = useSyncedCollection<SupportTicket>({
    storageKey: 'warroom_tickets',
    table: 'warroom_support_tickets',
    initial: []
  });

  const [replies, setReplies] = useSyncedCollection<SupportReply>({
    storageKey: 'warroom_replies',
    table: 'warroom_support_replies',
    initial: []
  });

  const [announcements, setAnnouncements] = useSyncedCollection<Announcement>({
    storageKey: 'warroom_announcements',
    table: 'warroom_announcements',
    initial: []
  });

  const [news, setNews] = useSyncedCollection<News>({
    storageKey: 'warroom_news',
    table: 'warroom_news',
    initial: []
  });

  const [notifications, setNotifications] = useSyncedCollection<AppNotification>({
    storageKey: 'warroom_notifications',
    table: 'warroom_notifications',
    initial: []
  });

  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);
  const [liveToastNotification, setLiveToastNotification] = useState<AppNotification | null>(null);

  // Dynamic CMS States (synced with Supabase when configured)
  const [siteSettings, setSiteSettings] = useSyncedSetting<Record<string, any>>({
    storageKey: 'warroom_site_settings',
    settingKey: 'site_settings',
    initial: () => ({
      siteName: 'اتاق جنگ',
      siteTagline: 'سامانه جامع مسابقات، مأموریت‌ها و ارزیابی هوشمند',
      badgeText: 'پرونده ماجراجویی هفت‌خوان',
      heroTitle: 'مأموریت اصلی: مسابقه بزرگ اتاق جنگ',
      heroProgress: '۷۲٪',
      heroCountdown: '۰۲:۱۴:۳۹:۱۵',
      showCountdownTimer: false,
      countdownTitle: 'مهلت ثبت‌نام و آغاز رویداد بزرگ اتاق جنگ',
      countdownPosition: 'middle',
      countdownStyle: 'tactical',
      removeTimerBorder: true,
      disableBannerLinks: false,
      hideRegistrationBanners: false,
      hideBannersOnExpiry: true,
      heroImage: '',
      heroVideoUrl: '',
      girlsBannerImage: '/images/banners/girls_registration_banner.webp',
      boysBannerImage: '/images/banners/boys_registration_banner.webp',
      bannerLayout: 'dual',
      iconAnimatedText: 'به بزرگترین رویداد رقابتی و استراتژیک اتاق جنگ خوش آمدید!',
      customLogoUrl: '/images/logos/warroom_logo.webp',
      homeSectionsOrder: ['hero', 'prizes', 'messengers', 'about', 'footer'],
      prizesSectionTitle: 'ویترین جایزه‌ها',
      prizesSectionSubtitle: 'کریستال جمع کن و جوایز ویژه سامانه را بازگشایی کن',
      prizesBadgeText: 'جوایز کشوری و استانی',
      prizesHeadingText: 'جوایز و هدایای ویژه برای نفرات برتر کشور و استان',
      prizesDescTitle: 'اهدای جوایز اختصاصی بر اساس کریستال‌های کسب‌شده',
      prizesDescText: 'تمام جوایز و امتیازات مورد نیاز توسط مدیر سامانه در پنل مدیریت تعیین و به روز می‌شوند.',
      prizesTopCardTitle: 'جوایز ارزنده سامانه',
      prizesTopCardTag: 'رتبه اول کشوری',
      prizesSideCard1Title: 'جایزه ویژه',
      prizesSideCard1Tag: 'ویترین',
      prizesSideCard2Title: 'هدایای رده‌بندی',
      prizesSideCard2Tag: 'برترین‌ها',
      prizesFeature1Title: 'جوایز دیجیتال و الکترونیک',
      prizesFeature1Desc: 'تعریف در پنل ادمین',
      prizesFeature2Title: 'کنسول بازی و هدایای ویژه',
      prizesFeature2Desc: 'بر اساس امتیازات',
      prizesFeature3Title: 'تبلت‌های دانش‌آموزی و قلم',
      prizesFeature3Desc: 'برندگان استانی',
      prizesFeature4Title: 'بسته‌های هدیه و نشان‌ها',
      prizesFeature4Desc: 'نفرات برتر',
      baleBadgeText: 'پیام‌رسان بله',
      baleHandle: '@warroom_app',
      baleChannelTitle: 'اخبار و اطلاعیه‌های رسمی اتاق جنگ',
      baleChannelSubtitle: 'اطلاعیه‌های فوری ستاد برگزاری، اعلام برندگان هفتگی و زمان‌بندی جوایز.',
      baleButtonText: 'کانال اتاق جنگ در بله',
      baleChannelUrl: 'https://ble.ir/warroom_app',
      eitaaBadgeText: 'پیام‌رسان ایتا',
      eitaaHandle: '@hisstory_official',
      eitaaChannelTitle: 'روایت‌ها و پشت‌صحنه اتاق جنگ',
      eitaaChannelSubtitle: 'روایت‌های اختصاصی کارآگاهان، سرنخ‌های مخفی مراحل و چالش‌های ویژه روزانه.',
      eitaaButtonText: 'کانال اتاق جنگ در ایتا',
      eitaaChannelUrl: 'https://eitaa.com/hisstory_official',
      stagesButtonTitle: 'مراحل مسابقه',
      stagesButtonSubtitle: 'نقشه ۷ مرحله ماجراجویی',
      guideButtonTitle: 'راهنمای مسابقه',
      guideButtonSubtitle: 'قوانین و نحوه امتیازگیری',
      aboutSectionTitle: 'درباره ما و پروژه اتاق جنگ',
      aboutSectionSubtitle: 'معرفی اهداف و رسالت سامانه',
      aboutSectionText: 'پلتفرم اتاق جنگ، سامانه جامع شبیه‌سازی تصمیم‌گیری استراتژیک، ارزیابی هوشمند و رقابت‌های گروهی دانش‌آموزی است که با هدف ارتقای آگاهی و تفکر تفکیکی طراحی گردیده است.',
      aboutSectionBadgeText: 'معرفی سامانه',
      aboutFeature1Title: 'شبیه‌سازی استراتژیک',
      aboutFeature1Desc: 'تصمیم‌گیری در شرایط بحران نبرد',
      aboutFeature2Title: 'ارزیابی هوشمند',
      aboutFeature2Desc: 'سنجش تفکر تحلیلی و تاکتیکی',
      aboutFeature3Title: 'رقابت‌های تیمی',
      aboutFeature3Desc: 'هم‌افزایی جوخه‌ها و گردان‌ها',
      gatewayTitle: 'درگاه پرداخت زرین‌پال',
      gatewaySubtitle: 'پرداخت ایمن ۲۵۶ بیتی',
      gatewayIconUrl: '',
      gatewayLinkUrl: 'https://zarinpal.com',
      enamadTitle: 'نماد اعتماد الکترونیکی',
      enamadSubtitle: 'وزارت صنعت، معدن و تجارت',
      enamadIconUrl: '',
      enamadLinkUrl: 'https://trustseal.enamad.ir/?id=7987091&Code=lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ',
      enamadEnabled: true,
      enamadHtmlCode: `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7987091&Code=lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7987091&Code=lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ' alt='' style='cursor:pointer' code='lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ'></a>`,
      heroButtonText: 'ورود و ثبت‌نام',
      contactPhone: '۰۲۱-۸۸۹۹۷۷۶۶',
      contactEmail: 'info@warroom.ir',
      telegram: 'WarRoom_Support',
      baleLink: 'https://bale.ai/warroom',
      eitaaLink: 'https://eitaa.com/warroom',
      address: 'تهران، بزرگراه شهید همت، ستاد مرکزی قرارگاه فضای مجازی',
      aboutText: 'پلتفرم اتاق جنگ یک سامانه تعاملی، رقابتی و آموزشی است که با هدف پرورش تفکر استراتژیک، افزایش توان تحلیل مسئله و تقویت روحیه کار تیمی در میان نوجوانان و جوانان طراحی شده است.',
      prizeTitle: 'جایزه‌ها و هدایای مسابقه بزرگ',
      prizeDescription: 'کریستال جمع کن و جایزه‌های نفیس اعم از کنسول بازی، تبلت و گوشی برنده شو!',
      homeButtons: defaultHomeButtons,
      homeBlocks: defaultHomeBlocks
    })
  });

  const [homeAnnouncements, setHomeAnnouncements] = useSyncedCollection<HomeAnnouncement>({
    storageKey: 'warroom_home_announcements',
    table: 'warroom_home_announcements',
    initial: []
  });

  const [homeStats, setHomeStats] = useSyncedSetting<HomeStats>({
    storageKey: 'warroom_home_stats',
    settingKey: 'home_stats',
    initial: () => homeStatsData
  });

  const [faqs, setFaqs] = useSyncedCollection<FaqItem>({
    storageKey: 'warroom_faqs',
    table: 'warroom_faqs',
    initial: []
  });

  // 🆕 🎖️ ویترین آثار (Showcase) — همگام با Supabase
  // پست‌ها از طریق تب «ویترین آثار» در پنل مدیریت یا تأیید آثار رزمندگان ساخته می‌شوند
  const [vitrinPosts, setVitrinPosts] = useSyncedCollection<VitrinPost>({
    storageKey: 'warroom_vitrin_custom_posts',
    table: 'warroom_vitrin_posts',
    initial: []
  });

  // 🆕 نظرات و دیدگاه‌های ویترین — هر ردیف یک نظر (همگام با Supabase)
  const [vitrinComments, setVitrinComments] = useSyncedCollection<VitrinComment>({
    storageKey: 'warroom_vitrin_comments',
    table: 'warroom_vitrin_comments',
    initial: []
  });

  // 🆕 درگاه‌های بازی / لینک‌دهی — همگام با Supabase
  const [gamePortals, setGamePortals] = useSyncedCollection<GamePortal>({
    storageKey: 'warroom_game_portals_list',
    table: 'warroom_game_portals',
    initial: []
  });

  // 🆕 مراحل نقشه بازی (Journey Stages) — همگام با Supabase
  const [stages, setStages] = useSyncedCollection<JourneyStage>({
    storageKey: 'warroom_stages_list',
    table: 'warroom_stages',
    initial: []
  });

  // 🆕 چالش‌های روزانه نقشه بازی — همگام بلادرنگ با جدول warroom_daily_challenges (دقیقاً مانند مراحل stages)
  const [dailyChallenges, setDailyChallenges] = useSyncedCollection<DailyChallengeConfig>({
    storageKey: 'warroom_all_daily_challenges',
    table: 'warroom_daily_challenges',
    initial: []
  });

  // چالش فعال جاری — اگر در جدول چالشی نباشد، به صورت بلادرنگ و قطعی null است
  const activeDailyChallenge = useMemo(() => {
    if (!Array.isArray(dailyChallenges) || dailyChallenges.length === 0) return null;
    return dailyChallenges.find(c => c.isActive && Boolean(c.title && c.title.trim())) || null;
  }, [dailyChallenges]);

  // 🛡️ درخواست‌های تغییر رمز عبور (حالت محلی) — در حالت بک‌اند، سرور مرجع است
  const [passwordResetRequests, setPasswordResetRequests] = useSyncedCollection<PasswordResetRequest>({
    storageKey: 'warroom_password_reset_requests',
    table: 'warroom_password_reset_requests',
    initial: []
  });

  // 🔤 بارگذاری و فعال‌سازی پویای فونت‌های سفارشی و آپلودشده
  useEffect(() => {
    if (siteSettings?.customFontName && siteSettings?.customFontDataUrl) {
      injectCustomFontFace(
        siteSettings.customFontName,
        siteSettings.customFontDataUrl,
        siteSettings.customFontFormat || 'woff2'
      );
    }
    if (siteSettings?.customFontCssUrl) {
      injectCustomFontCssUrl(siteSettings.customFontCssUrl);
    }
  }, [
    siteSettings?.customFontName,
    siteSettings?.customFontDataUrl,
    siteSettings?.customFontFormat,
    siteSettings?.customFontCssUrl
  ]);

  const [paymentSettings, setPaymentSettings] = useSyncedSetting<PaymentSettings>({
    storageKey: 'warroom_payment_settings',
    settingKey: 'payment_settings',
    initial: () => ({
      id: 'payment_settings',
      enabled: true,
      amount: 3500000,
      currency: 'IRT',
      gateway: 'zarinpal',
      api_key: 'zarinpal_merchant_36_characters_code',
      redirect_url: 'https://zarinpal.com/pg/StartPay/',
      callback_url: 'https://warroom-game.ir/payment/callback',
      description: 'هزینه ثبت‌نام و شرکت در ماراتن بزرگ اتاق جنگ',
      card_enabled: true,
      card_number: '۶۰۳۷۹۹۷۵۱۲۳۴۵۶۷۸',
      card_holder: 'ستاد برگزاری مسابقه بزرگ اتاق جنگ',
      card_bank: 'بانک ملی ایران',
      card_instructions: 'لطفاً پس از انتقال وجه به شماره کارت فوق، کادرهای مربوط به نام و کد پیگیری را پر کرده و دکمه ارسال را کلیک کنید تا رسید شما برای تایید مدیریت ارسال شود و دسترسی پنل شما بازگردد.',
      updated_at: new Date().toISOString()
    })
  });

  const [paymentTransactions, setPaymentTransactions] = useSyncedCollection<PaymentTransaction>({
    storageKey: 'warroom_payment_transactions',
    table: 'warroom_payment_transactions',
    initial: []
  });

  // 🧭 تنظیمات و متن‌های راهنمای تعاملی کاربر — همگام با Supabase
  const [guideConfig, setGuideConfig] = useSyncedSetting<GuideTutorialConfig>({
    storageKey: 'warroom_guide_config',
    settingKey: 'guide_tutorial_config',
    initial: () => defaultGuideConfig
  });

  // 🎁 مدیریت سیستم جوایز و کریستال‌ها — همگام با Supabase
  const [prizes, setPrizes] = useSyncedCollection<PrizeItem>({
    storageKey: 'warroom_prizes_list',
    table: 'warroom_prizes',
    initial: []
  });

  // نقشه‌ی نظرات بر اساس پست (برای مصرف در کامپوننت‌ها)
  const vitrinCommentsMap: Record<string, VitrinComment[]> = {};
  vitrinComments.forEach(c => {
    (vitrinCommentsMap[c.postId] = vitrinCommentsMap[c.postId] || []).push(c);
  });

  // صحت‌سنجی زنده اتصال به Supabase بدون پاک‌کردن داده‌های نشست و حالت‌ها
  useEffect(() => {
    checkSupabaseHealth();
  }, []);

  // 🛡️ بررسی سلامت بک‌اند امن و پایش وضعیت آن
  const [backendReady, setBackendReady] = useState<boolean>(() => Boolean(getBackendStatus()?.available));
  useEffect(() => {
    probeBackend();
    return subscribeBackendStatus((status) => setBackendReady(Boolean(status.available)));
  }, []);

  // 🛡️ اعتبارسنجی نشست سمت سرور هنگام بارگذاری برنامه:
  const routeAuthenticatedUser = (user: User | null) => {
    if (!user) {
      setCurrentUser(null);
      setIsAdminMode(false);
      setMustChangePassword(false);
      return;
    }

    const safeUser = { ...user, password: '' };
    setCurrentUser(safeUser);
    setMustChangePassword(false);
    setShowAuthScreen(false);

    if (safeUser.role === 'admin') {
      setIsAdminMode(true);
      setActiveTab('Admin');
      setShowGamePortal(false);
      return;
    }

    setIsAdminMode(false);
    setShowGamePortal(false);
    setActiveTab('Journey');
  };

  useEffect(() => {
    if (!backendReady) return;
    let cancelled = false;

    apiSession().then((res) => {
      if (cancelled) return;
      const serverUser: User | undefined = res.ok && res.data?.authenticated ? (res.data.user as User) : undefined;

      if (!serverUser) {
        try {
          const storedUser = localStorage.getItem('warroom_current_user_data');
          if (storedUser) {
            const parsed = JSON.parse(storedUser) as User | null;
            if (parsed?.id) {
              const safeUser = { ...parsed, password: '' } as User;
              setCurrentUser(safeUser);
              return;
            }
          }
        } catch {
          // Fall through
        }
        setCurrentUser(null);
        setIsAdminMode(false);
        setMustChangePassword(false);
        return;
      }

      const safeUser: User = { ...serverUser, password: '' };
      setCurrentUser((prev) => (prev && prev.id === safeUser.id ? { ...prev, ...safeUser } : safeUser));
      setMustChangePassword(false);
    });

    return () => { cancelled = true; };
  }, [backendReady]);

  // 🛡️ پاک‌سازی رمزهای باقی‌مانده در حافظه مرورگر در «حالت امن»
  useEffect(() => {
    if (!backendReady) return;
    setUsers(prev => {
      const hasSecret = prev.some(u => Boolean(u.password));
      return hasSecret ? prev.map(u => ({ ...u, password: '' })) : prev;
    });
  }, [backendReady, setUsers]);

  // همگام‌سازی ذخیره‌های ویترین با Supabase هنگام تغییر (Bookmark Toggle)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      persistSavedPostsToDb(detail.userId, detail.ids);
    };
    window.addEventListener('warroom_saved_posts_changed', handler);
    return () => window.removeEventListener('warroom_saved_posts_changed', handler);
  }, []);

  // دریافت تغییرات نظرات که توسط کامپوننت‌ها از طریق ابزارهای vitrinData انجام می‌شود
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setVitrinComments(detail);
      }
    };
    window.addEventListener('warroom_vitrin_comments_updated', handler);
    return () => window.removeEventListener('warroom_vitrin_comments_updated', handler);
  }, [setVitrinComments]);

  /**
   * ثبت درخواست تغییر رمز در «حالت محلی» (زمانی که بک‌اند امن در دسترس نیست).
   * در حالت امن، این کار توسط سرور انجام و در پنل مدیریت نمایش داده می‌شود.
   */
  const createLocalPasswordResetRequest = (input: {
    nationalCode: string;
    contactPhone?: string;
    note?: string;
  }): { trackingCode: string } => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const trackingCode = `WR-${code}`;

    const targetUser = users.find(
      u => String(u.national_code || '').replace(/\D/g, '') === input.nationalCode
    );

    const request: PasswordResetRequest = {
      id: `pr_local_${Date.now()}`,
      tracking_code: trackingCode,
      user_id: targetUser?.id,
      national_code: input.nationalCode,
      personal_code: targetUser?.personal_code,
      full_name: targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : '',
      account_phone: targetUser?.phone || '',
      contact_phone: input.contactPhone || targetUser?.phone || '',
      note: input.note,
      status: 'pending',
      source: 'local',
      created_at: new Date().toISOString()
    };

    setPasswordResetRequests(prev => [request, ...prev]);
    return { trackingCode };
  };

  // Current Logged-in User (Managed in memory + Supabase backend)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const clearAllAppStorage = () => {
    try {
      const keys = [...Object.keys(localStorage)];
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore storage access issues in restricted contexts.
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('warroom_current_user_data');
      if (!storedUser) return;
      const parsed = JSON.parse(storedUser) as User | null;
      if (parsed && parsed.id) {
        const safeUser = { ...parsed, password: '' } as User;
        setCurrentUser(safeUser);
        routeAuthenticatedUser(safeUser);
      } else {
        localStorage.removeItem('warroom_current_user_data');
      }
    } catch {
      localStorage.removeItem('warroom_current_user_data');
    }
  }, []);

  // Keep theme in sync with currentUser gender
  useEffect(() => {
    if (currentUser) {
      if (currentUser.gender === 'دختر') {
        setCampaignTheme('girls');
      } else if (currentUser.gender === 'پسر') {
        setCampaignTheme('boys');
      }
    }
  }, [currentUser]);

  // بارگذاری ذخیره‌های (Bookmark) کاربر از دیتابیس Supabase
  useEffect(() => {
    if (currentUser) {
      loadSavedPostsFromDb(currentUser.id);
    }
  }, [currentUser?.id]);

  // Active Campaign Theme: 'girls' vs 'boys'
  const [campaignTheme, setCampaignTheme] = useState<'girls' | 'boys'>(() => {
    const savedTheme = localStorage.getItem('hisstory_theme_mode');
    return savedTheme === 'girls' ? 'girls' : 'boys';
  });

  // UI Navigation State
  const [activeTab, setActiveTab] = useState<string>('Home');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(false);
  const [showGamePortal, setShowGamePortal] = useState<boolean>(false);
  const [isGamePortalMandatory, setIsGamePortalMandatory] = useState<boolean>(false);
  /** 🛡️ الزام تغییر رمز پیش‌فرض/موقت (اعلام‌شده توسط سرور) */
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register_individual' | 'register_group'>('register_individual');

  // Global active modal tracking (hides bottom nav & music bar with smooth exit animation when any modal opens)
  const [modalActiveCount, setModalActiveCount] = useState<number>(0);

  useEffect(() => {
    const handleModalChange = (e: any) => {
      if (e.detail && typeof e.detail.active === 'boolean') {
        if (e.detail.active) {
          setModalActiveCount(prev => prev + 1);
        } else {
          setModalActiveCount(prev => Math.max(0, prev - 1));
        }
      }
    };

    window.addEventListener('warroom_modal_active_change' as any, handleModalChange);
    return () => {
      window.removeEventListener('warroom_modal_active_change' as any, handleModalChange);
    };
  }, []);

  const isModalActive = modalActiveCount > 0;

  const handleDirectLogin = () => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        setIsAdminMode(true);
        setActiveTab('Admin');
        setShowGamePortal(false);
        setShowAuthScreen(false);
        triggerAlert(`ورود مستقیم به پنل مدیریت: ${currentUser.first_name} ${currentUser.last_name}`);
      } else {
        setIsAdminMode(false);
        setActiveTab('Journey');
        setShowGamePortal(false);
        setShowAuthScreen(false);
        triggerAlert(`ورود مستقیم به پنل کاربری: ${currentUser.first_name} ${currentUser.last_name}`);
      }
      return;
    }
    setAuthMode('login');
    setShowAuthScreen(true);
  };

  const handleTabChange = (tab: string) => {
    setShowAuthScreen(false);
    if (tab === 'GamePortals') {
      setIsGamePortalMandatory(false);
      setShowGamePortal(true);
      return;
    }
    setShowGamePortal(false);
    setIsAdminMode(tab === 'Admin');
    setActiveTab(tab);
    setModalActiveCount(0);
  };
  const [showSquadModal, setShowSquadModal] = useState<boolean>(false);
  const [showChatRoomModal, setShowChatRoomModal] = useState<boolean>(false);
  // Persistent web design floating chat state
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('warroom_chat_open_state');
      if (saved !== null) return saved === 'true';
    }
    return false; // Default closed so it does not jump out or block the page
  });

  const handleToggleFloatingChat = () => {
    setIsFloatingChatOpen(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('warroom_chat_open_state', String(next));
      }
      return next;
    });
  };

  const handleCloseFloatingChat = () => {
    setIsFloatingChatOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('warroom_chat_open_state', 'false');
    }
  };

  // Alias for backward compatibility
  const showMobileChatRoom = showChatRoomModal;
  const setShowMobileChatRoom = setShowChatRoomModal;
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showOnboardingTutorial, setShowOnboardingTutorial] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alertNotification, setAlertNotification] = useState<string | null>(null);

  useEffect(() => {
    // Force enable payments by default and clear any stale disabled states in localStorage
    try {
      const saved = localStorage.getItem('warroom_payment_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (!parsed.enabled || parsed.amount === 0)) {
          parsed.enabled = true;
          parsed.amount = 3500000;
          parsed.currency = 'IRT';
          parsed.gateway = 'zarinpal';
          parsed.card_enabled = true;
          parsed.card_number = '۶۰۳۷۹۹۷۵۱۲۳۴۵۶۷۸';
          parsed.card_holder = 'ستاد برگزاری مسابقه بزرگ اتاق جنگ';
          parsed.card_bank = 'بانک ملی ایران';
          parsed.card_instructions = 'لطفاً پس از انتقال وجه به شماره کارت فوق، کادرهای مربوط به نام و کد پیگیری را پر کرده و دکمه ارسال را کلیک کنید تا رسید شما برای تایید مدیریت ارسال شود و دسترسی پنل شما بازگردد.';
          localStorage.setItem('warroom_payment_settings', JSON.stringify(parsed));
          setPaymentSettings(parsed as PaymentSettings);
        }
      } else {
        const defaultSettings = {
          id: 'payment_settings',
          enabled: false,
          amount: 0,
          currency: 'IRT' as const,
          gateway: 'zarinpal' as const,
          api_key: '',
          redirect_url: '',
          callback_url: '',
          description: 'ثبت‌نام رایگان در ماراتن بزرگ اتاق جنگ',
          card_enabled: false,
          card_number: '',
          card_holder: '',
          card_bank: '',
          card_instructions: '',
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('warroom_payment_settings', JSON.stringify(defaultSettings));
        setPaymentSettings(defaultSettings as PaymentSettings);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 🛡️ اگر کاربر توسط ادمین مسدود (بلاک) شد، بلافاصله لغو نشست و هدایت مستقیم به صفحه ورود / ثبت نام انجام می‌شود
  useEffect(() => {
    if (currentUser && currentUser.is_blocked) {
      handleLogout();
      triggerAlert('حساب کاربری شما توسط مدیریت مسدود شده است.');
    }
  }, [currentUser?.is_blocked]);

  useEffect(() => {
    const openSquad = () => setShowSquadModal(true);
    const openNotifications = () => setShowNotificationCenter(true);
    const openChat = () => {
      handleTabChange('Chat');
    };
    window.addEventListener('warroom_open_squad_modal', openSquad);
    window.addEventListener('warroom_open_notifications', openNotifications);
    window.addEventListener('warroom_open_chat_modal', openChat);

    const handleChallengeUpdated = (e: any) => {
      if (e.detail && e.detail.id) {
        setDailyChallenges(prev => {
          const exists = prev.some(c => c.id === e.detail.id);
          if (exists) {
            return prev.map(c => c.id === e.detail.id ? { ...c, ...e.detail } : (e.detail.isActive ? { ...c, isActive: false } : c));
          }
          return [...(e.detail.isActive ? prev.map(c => ({ ...c, isActive: false })) : prev), e.detail];
        });
      }
    };

    const handleChallengeDeleted = (e: any) => {
      const id = e?.detail?.id;
      if (id === 'all') {
        setDailyChallenges([]);
      } else if (id) {
        setDailyChallenges(prev => prev.filter(c => c.id !== id));
      }
    };

    window.addEventListener('warroom_daily_challenge_updated' as any, handleChallengeUpdated);
    window.addEventListener('warroom_daily_challenge_deleted' as any, handleChallengeDeleted);

    // Purge legacy KV row and invalid local items
    try {
      localStorage.removeItem('warroom_daily_challenge_config');
    } catch {}
    if (isSupabaseEnabled && supabase) {
      void supabase.from('warroom_kv').delete().eq('id', 'daily_challenge_config');
    }

    return () => {
      window.removeEventListener('warroom_open_squad_modal', openSquad);
      window.removeEventListener('warroom_open_notifications', openNotifications);
      window.removeEventListener('warroom_open_chat_modal', openChat);
      window.removeEventListener('warroom_daily_challenge_updated' as any, handleChallengeUpdated);
      window.removeEventListener('warroom_daily_challenge_deleted' as any, handleChallengeDeleted);
    };
  }, []);

  // Pre-warm lazy-loaded navigation modules on idle for zero-lag instant tab switching
  useEffect(() => {
    const warmup = () => {
      prefetchViewChunk('Journey');
      prefetchViewChunk('Rewards');
      prefetchViewChunk('Vitrin');
      prefetchViewChunk('Prizes');
    };
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(warmup);
      } else {
        setTimeout(warmup, 80);
      }
    }
  }, []);

  // Eligibility checker for real-time notifications
  const isEligibleForNotification = (notif: AppNotification, user: User | null) => {
    if (!user) return notif.target === 'all';
    if (notif.target === 'all') return true;
    if (notif.target === 'girls' && user.gender === 'دختر') return true;
    if (notif.target === 'boys' && user.gender === 'پسر') return true;
    if (notif.target === 'leaders' && user.role === 'leader') return true;
    if (notif.target === 'users' && user.role === 'user') return true;
    if (notif.target === 'specific_user' && (notif.target_user_id === user.id || notif.target_personal_code === user.personal_code)) return true;
    if (notif.target === 'specific_squad' && user.group_id && notif.target_group_id === user.group_id) return true;
    if (user.role === 'admin') return true;
    return false;
  };

  const lastProcessedNotifIdRef = useRef<string | null>(null);

  // Real-time notification broadcaster & listener across browser tabs
  useEffect(() => {
    const triggerUniqueNotification = (notif: AppNotification) => {
      if (!notif || !notif.id) return;
      if (lastProcessedNotifIdRef.current === notif.id) return;
      lastProcessedNotifIdRef.current = notif.id;

      if (isEligibleForNotification(notif, currentUser)) {
        setLiveToastNotification(notif);
      }
    };

    const handleBroadcastEvent = (e: any) => {
      triggerUniqueNotification(e.detail);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'warroom_last_live_notification' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.notif) {
            triggerUniqueNotification(parsed.notif);
          }
        } catch (err) {}
      }
      if (e.key === 'warroom_notifications' && e.newValue) {
        try {
          setNotifications(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('warroom_live_broadcast', handleBroadcastEvent);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('warroom_live_broadcast', handleBroadcastEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [currentUser]);

  // Calculate unread notifications count for current user
  const unreadNotificationsCount = notifications.filter(n => {
    if (!currentUser) return false;
    if (!isEligibleForNotification(n, currentUser)) return false;
    return !n.is_read_by.includes(currentUser.id);
  }).length;

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('warroom_current_user_id', currentUser.id);
    } else {
      localStorage.removeItem('warroom_current_user_id');
    }
  }, [currentUser]);

  // System notification alert trigger
  const triggerAlert = (msg: string) => {
    setAlertNotification(msg);
    setTimeout(() => {
      setAlertNotification(null);
    }, 4500);
  };

  const handleLogout = () => {
    // 🛡️ ابطال نشست سمت سرور (توکن هش‌شده + کوکی HttpOnly)
    if (backendReady) {
      apiLogout().catch(() => { /* خروج محلی در هر صورت انجام می‌شود */ });
    }
    setMustChangePassword(false);
    setCurrentUser(null);
    setIsAdminMode(false);
    setActiveTab('Home');
    setShowAuthScreen(false);
    setModalActiveCount(0);
    clearAllAppStorage();
    triggerAlert('خروج از سامانه اتاق جنگ با موفقیت انجام شد.');
  };

  const handleLoginSuccess = async (user: User, _meta?: { mustChangePassword?: boolean; isNewRegistration?: boolean }) => {
    const safeUser: User = { ...user, password: '' };
    const sessionId = `warroom_session_${safeUser.id}_${Date.now()}`;
    const sessionPayload = {
      userId: safeUser.id,
      expiresAt: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
      role: safeUser.role,
      name: `${safeUser.first_name} ${safeUser.last_name}`,
    };

    setCurrentUser(safeUser);
    setShowAuthScreen(false);
    setMustChangePassword(Boolean(_meta?.mustChangePassword || user.mustChangePassword));
    localStorage.setItem('warroom_current_user_data', JSON.stringify(safeUser));
    localStorage.setItem('warroom_current_user_id', safeUser.id);
    localStorage.setItem('warroom_session_id', sessionId);

    try {
      const { setRedisSession } = await import('./lib/redisClient');
      await setRedisSession(sessionId, sessionPayload, 7 * 24 * 60 * 60);
    } catch {
      // Redis is optional; session remains localStorage-backed for app-level persistence.
    }

    if (safeUser.gender === 'دختر') {
      setCampaignTheme('girls');
    } else {
      setCampaignTheme('boys');
    }

    if (safeUser.role === 'admin') {
      setIsAdminMode(true);
      setActiveTab('Admin');
      setShowGamePortal(false);
      triggerAlert(`خوش آمدید مدیر کل ${safeUser.first_name} ${safeUser.last_name} — وارد پنل مدیریت شدید.`);
      return;
    }

    setIsAdminMode(false);
    setActiveTab('Journey');
    setIsGamePortalMandatory(false);
    setShowGamePortal(false);

    if (_meta?.isNewRegistration) {
      triggerAlert(`ثبت‌نام با موفقیت انجام شد. خوش آمدید رزمنده ${safeUser.first_name} ${safeUser.last_name} — وارد پنل کاربری شدید.`);
    } else {
      triggerAlert(`خوش آمدید رزمنده ${safeUser.first_name} ${safeUser.last_name} — به سامانه اتاق جنگ خوش آمدید.`);
    }
  };

  // Guard: Live Kick Out ONLY if explicitly Blocked
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      const dbUser = users.find(u => u.id === currentUser.id);
      if (dbUser) {
        if (dbUser.is_blocked) {
          setCurrentUser(null);
          localStorage.removeItem('warroom_current_user_id');
          localStorage.removeItem('warroom_current_user_data');
          setShowAuthScreen(true);
          triggerAlert('حساب کاربری شما توسط مدیریت مسدود شد.');
        }
      }
    }
  }, [users, currentUser]);

  const handleSelectWarRoom = (game?: GamePortal) => {
    setIsGamePortalMandatory(false);
    setShowGamePortal(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('warroom_selected_game_id', game?.id || 'warroom');
    }
    const user = currentUser;

    if (user) {
      if (user.role === 'admin') {
        setIsAdminMode(true);
        setActiveTab('Admin');
      } else {
        setIsAdminMode(false);
        setActiveTab('Journey');
        setShowOnboardingTutorial(true); // Launch Commander Guided Tutorial
      }
      triggerAlert(`ورود موفقیت‌آمیز به سامانه بازی «${game?.title || 'اتاق جنگ'}»`);
    } else {
      setActiveTab('Journey');
    }
  };

  const handleCloseGamePortal = () => {
    setIsGamePortalMandatory(false);
    setShowGamePortal(false);
  };

  const handleOpenAuth = (mode: 'login' | 'register_individual' | 'register_group') => {
    setAuthMode(mode);
    setShowGamePortal(false);
    setShowAuthScreen(true);
  };

  // Guard: Regular users are routed to Journey if they attempt to access Dashboard
  useEffect(() => {
    if (!isAdminMode && activeTab === 'Dashboard') {
      setActiveTab('Journey');
    }
  }, [isAdminMode, activeTab]);

  const isGirlsTheme = siteSettings?.siteThemeMode === 'girls'
    ? true
    : siteSettings?.siteThemeMode === 'boys'
    ? false
    : siteSettings?.siteThemeMode === 'tactical_dark'
    ? false
    : (campaignTheme === 'girls' || currentUser?.gender === 'دختر');

  return (
    <div 
      className={`text-slate-100 min-h-screen w-full overflow-x-hidden flex flex-col relative font-sans dir-rtl transition-colors duration-700 ${
        isGirlsTheme ? 'girls-atmosphere-bg girl-theme' : 'boys-atmosphere-bg boy-theme'
      }`}
      style={{
        backgroundColor: siteSettings?.siteCustomBgColor || undefined,
        fontFamily: siteSettings?.siteFontFamily || undefined,
      }}
    >
      
      {/* Loading Screen with Radar & Logo */}
      {isLoading && (
        <LoadingScreen onComplete={() => setIsLoading(false)} isGirls={isGirlsTheme} />
      )}

      <InternalDialogHost />

      {/* Background Epic Music Toggle */}
      <BackgroundMusic />

      {/* Dynamic Background Atmosphere */}
      {isGirlsTheme ? (
        /* Girls Wallpaper Atmosphere: Obsidian top, Neon Magenta bottom-left, Royal Violet bottom-right */
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-[#020005] via-[#080110]/60 to-transparent" />
          <div className="absolute -bottom-24 -left-20 w-[550px] sm:w-[700px] h-[550px] sm:h-[700px] blur-[140px] sm:blur-[170px] rounded-full bg-[#ff1389]/30 pointer-events-none transition-all duration-700" />
          <div className="absolute -bottom-24 -right-20 w-[600px] sm:w-[750px] h-[600px] sm:h-[750px] blur-[150px] sm:blur-[180px] rounded-full bg-[#7c3aed]/35 pointer-events-none transition-all duration-700" />
          <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[500px] h-[400px] blur-[160px] rounded-full bg-[#4a0d67]/25 pointer-events-none" />
          {siteSettings?.siteBgPattern === 'grid' && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-70" />
          )}
          {siteSettings?.siteBgPattern === 'dots' && (
            <div className="absolute inset-0 bg-[radial-gradient(rgba(244,63,94,0.15)_1px,transparent_1px)] bg-[size:24px_24px] opacity-80" />
          )}
        </div>
      ) : (
        /* Boys Wallpaper Atmosphere: Exactly matching uploaded wallpaper (Obsidian void top, Crimson Red bottom-left, Electric Cobalt Blue bottom-right, Central violet blend, and crisp 32px grid) */
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 inset-x-0 h-[45vh] bg-gradient-to-b from-[#000104] via-[#010309]/85 to-transparent" />
          <div className="absolute -bottom-20 -left-20 w-[550px] sm:w-[750px] h-[550px] sm:h-[750px] blur-[130px] sm:blur-[160px] rounded-full bg-gradient-to-tr from-[#991b1b] via-[#dc2626] to-[#e11d48] opacity-65 pointer-events-none transition-all duration-700" />
          <div className="absolute -bottom-20 -right-20 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] blur-[140px] sm:blur-[170px] rounded-full bg-gradient-to-tl from-[#1e40af] via-[#2563eb] to-[#3b82f6] opacity-70 pointer-events-none transition-all duration-700" />
          <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[550px] h-[350px] blur-[150px] rounded-full bg-[#581c87]/35 pointer-events-none" />
          {siteSettings?.siteBgPattern !== 'none' && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.075)_1px,transparent_1px)] bg-[size:32px_32px] opacity-80" />
          )}
        </div>
      )}

      {/* Global Toast Alert Notification (Swipeable right on Touch/Mobile + Close X Button) */}
      <AnimatePresence>
        {alertNotification && (
          <motion.div
            key="global-alert-toast"
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, x: 280, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.05, right: 0.8 }}
            onDragEnd={(_e, info) => {
              // Swipe right gesture detection
              if (info.offset.x > 50 || info.velocity.x > 150) {
                setAlertNotification(null);
              }
            }}
            className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 z-50 p-[1px] rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 shadow-[0_0_30px_rgba(220,38,38,0.6)] sm:max-w-md cursor-grab active:cursor-grabbing touch-pan-y"
          >
            <div className="p-3.5 sm:p-4 rounded-[15px] bg-[#050818]/95 flex items-start justify-between gap-3 border border-red-500/40 dir-rtl select-none">
              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-red-950 text-red-400 border border-red-800 shadow-inner">
                  <Bell size={16} className="animate-bounce" />
                </span>
                <div className="space-y-0.5 text-right min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400 font-mono">پیام سیستم اتاق جنگ</span>
                    <span className="text-[9px] text-amber-400/80 font-mono hidden sm:inline-block">← بکشید به راست</span>
                  </div>
                  <p className="text-xs text-slate-100 font-semibold leading-relaxed break-words">
                    {alertNotification}
                  </p>
                </div>
              </div>

              {/* Close Button ('X') for Web & Desktop */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAlertNotification(null);
                }}
                className="p-1 rounded-lg bg-slate-900/90 text-slate-400 hover:text-white hover:bg-red-950/80 border border-slate-800 hover:border-red-500/50 transition shrink-0"
                title="بستن هشدار"
                aria-label="بستن هشدار"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthScreen ? (
          /* Authentication / Registration Page for War Room */
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Suspense fallback={<ViewFallback />}>
              <AuthView 
                users={users}
                setUsers={setUsers}
                groups={groups}
                setGroups={setGroups}
                onLoginSuccess={handleLoginSuccess}
                triggerAlert={triggerAlert}
                onBackToHome={() => {
                  const savedTheme = localStorage.getItem('hisstory_theme_mode');
                  if (savedTheme === 'girls' || savedTheme === 'boys') {
                    setCampaignTheme(savedTheme);
                  }
                  setShowAuthScreen(false);
                  setActiveTab('Home');
                }}
                initialAuthMode={authMode}
                campaignTheme={campaignTheme}
                onGenderChange={(gender) => {
                  const nextTheme = gender === 'دختر' ? 'girls' : 'boys';
                  setCampaignTheme(nextTheme);
                  localStorage.setItem('hisstory_theme_mode', nextTheme);
                }}
                paymentSettings={paymentSettings}
                addPaymentTransaction={(transaction) => {
                  setPaymentTransactions(prev => [transaction, ...prev.filter(item => item.id !== transaction.id)]);
                }}
                createLocalPasswordResetRequest={createLocalPasswordResetRequest}
              />
            </Suspense>
          </motion.div>
        ) : activeTab === 'Home' ? (
          /* Primary Mobile-First Home Landing View */
          <motion.div
            key="homeView"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <HomeView 
              currentUser={currentUser}
              groups={groups}
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              onOpenAuth={handleOpenAuth}
              onLogout={handleLogout}
              onOpenSquadModal={() => setShowSquadModal(true)}
              onOpenGamePortal={() => setShowGamePortal(true)}
              triggerAlert={triggerAlert}
              siteSettings={siteSettings}
              homeAnnouncements={homeAnnouncements}
              homeStats={homeStats}
              faqs={faqs}
              prizes={prizes}
              campaignTheme={campaignTheme}
              onChangeCampaign={(targetTheme?: 'girls' | 'boys') => {
                const newTheme = targetTheme || (campaignTheme === 'boys' ? 'girls' : 'boys');
                setCampaignTheme(newTheme);
                localStorage.setItem('hisstory_theme_mode', newTheme);
                triggerAlert(newTheme === 'girls' ? 'تم دخترانه فعال شد.' : 'تم مردانه (پسرانه) فعال شد.');
              }}
            />
          </motion.div>
        ) : (activeTab === 'Support' || activeTab === 'Contact') ? (
          /* Standalone Animated Contact & Ticket Page (Public & Independent - 100% Solid) */
          <motion.div
            key="contactPage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-h-screen bg-[#090e1f] text-slate-100 py-6 px-3 sm:px-6 dir-rtl relative z-10"
          >
            <Suspense fallback={<ViewFallback />}>
              <ContactView 
                onNavigate={(tab) => handleTabChange(tab)}
                triggerAlert={triggerAlert}
                siteSettings={siteSettings}
                currentUser={currentUser}
                tickets={tickets}
                setTickets={setTickets}
              />
            </Suspense>
          </motion.div>
        ) : activeTab === 'About' ? (
          /* Standalone Animated About Us Page (100% Solid) */
          <motion.div
            key="aboutPage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-h-screen bg-[#090e1f] text-slate-100 py-6 px-3 sm:px-6 dir-rtl relative z-10"
          >
            <Suspense fallback={<ViewFallback />}>
              <AboutView 
                onNavigate={(tab) => handleTabChange(tab)}
                siteSettings={siteSettings}
                homeStats={homeStats}
              />
            </Suspense>
          </motion.div>
        ) : activeTab === 'Rules' ? (
          /* Standalone Animated Rules Page (100% Solid) */
          <motion.div
            key="rulesPage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-h-screen bg-[#090e1f] text-slate-100 py-6 px-3 sm:px-6 dir-rtl relative z-10"
          >
            <Suspense fallback={<ViewFallback />}>
              <RulesView 
                onNavigate={(tab) => handleTabChange(tab)}
                siteSettings={siteSettings}
              />
            </Suspense>
          </motion.div>
        ) : (currentUser && currentUser.role !== 'admin' && !isAdminMode && currentUser.is_blocked) ? (
          /* MANDATORY ACCESS BARRIER OVERLAY (ONLY FOR BLOCKED USERS) */
          <motion.div
            key="access_barrier"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-[#060a17] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 dir-rtl relative z-50 overflow-y-auto"
          >
            {/* Dark grid background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_60%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <div className="w-full max-w-4xl space-y-6 relative z-10 py-8">
              {/* Header block */}
              <div className="text-center space-y-2">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-500/20 to-rose-600/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)] mb-2">
                  <ShieldAlert size={32} className="animate-pulse" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">سد امنیتی و دسترسی مسابقه بزرگ اتاق جنگ</h1>
                <p className="text-xs text-slate-400">ستاد فرماندهی و ارزیابی مسابقات اتاق جنگ</p>
              </div>

              {/* Blocked Account Card */}
              <div className="max-w-md mx-auto rounded-3xl border-2 border-red-500/40 bg-red-950/20 p-6 text-center space-y-4 shadow-xl">
                <h2 className="text-lg font-black text-red-400">حساب کاربری مسدود شده است</h2>
                <p className="text-xs leading-relaxed text-slate-300">
                  رزمنده گرامی، حساب کاربری شما به دلیل نقض قوانین، فعالیت‌های مشکوک یا دستور ستاد داوری به‌طور کامل مسدود (بلاک) گردیده است. امکان ورود و دسترسی به هیچ‌یک از بخش‌های پنل کاربری برای شما وجود ندارد.
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  خروج از حساب کاربری
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Main Platform View for other logged-in tabs */
          <motion.div
            key="platform"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-h-screen flex flex-col relative z-10"
          >
            {/* Top Navigation Bar */}
            <Navbar 
              currentUser={currentUser}
              currentTab={activeTab}
              setCurrentTab={handleTabChange}
              onLogout={handleLogout}
              onOpenSquadModal={() => setShowSquadModal(true)}
              onOpenNotifications={() => setShowNotificationCenter(true)}
              onOpenGamePortal={() => setShowGamePortal(true)}
              unreadNotificationsCount={unreadNotificationsCount}
              isAdminView={isAdminMode}
              setIsAdminView={setIsAdminMode}
              campaignTheme={campaignTheme}
              isFloatingChatOpen={isFloatingChatOpen}
              onToggleFloatingChat={handleToggleFloatingChat}
            />

            {currentUser && currentUser.role !== 'admin' && !isAdminMode && isFloatingChatOpen && activeTab !== 'Chat' && (
              <GroupChatPanel
                currentUser={currentUser}
                users={users}
                setUsers={setUsers}
                setGroups={setGroups}
                groups={groups}
                groupJoinRequests={groupJoinRequests}
                setGroupJoinRequests={setGroupJoinRequests}
                onOpenSquadModal={() => setShowSquadModal(true)}
                onClose={handleCloseFloatingChat}
              />
            )}

            {/* Floating Chat Room Toggle Button when chat is closed / inactive */}
            {currentUser && currentUser.role !== 'admin' && !isAdminMode && !isFloatingChatOpen && activeTab !== 'Chat' && (
              <DraggableFloatingChatButton
                isGirlsTheme={campaignTheme === 'girls' || currentUser?.gender === 'دختر'}
                onToggle={handleToggleFloatingChat}
              />
            )}

            {/* Main Content Body */}
            <main className={`flex-1 w-full mx-auto ${
              activeTab === 'Journey'
                ? 'max-w-full px-0 py-0 flex flex-col h-[calc(100vh-64px)] overflow-hidden'
                : 'max-w-7xl px-4 md:px-8 pt-5 pb-28 md:pb-8'
            }`}>
              <Suspense fallback={<ViewFallback />}>
                {isAdminMode ? (
                  <AdminErrorBoundary onReset={() => { setIsAdminMode(false); setActiveTab('Home'); }}>
                    <AdminPanel 
                      currentUser={currentUser!}
                      users={users}
                      setUsers={setUsers}
                      groups={groups}
                      setGroups={setGroups}
                      missions={missions}
                      setMissions={setMissions}
                      submissions={submissions}
                      setSubmissions={setSubmissions}
                      trainings={trainings}
                      setTrainings={setTrainings}
                      medals={medals}
                      setMedals={setMedals}
                      userMedals={userMedals}
                      setUserMedals={setUserMedals}
                      tickets={tickets}
                      setTickets={setTickets}
                      replies={replies}
                      setReplies={setReplies}
                      announcements={announcements}
                      setAnnouncements={setAnnouncements}
                      news={news}
                      setNews={setNews}
                      notifications={notifications}
                      setNotifications={setNotifications}
                      vitrinPosts={vitrinPosts}
                      setVitrinPosts={setVitrinPosts}
                      gamePortals={gamePortals}
                      setGamePortals={setGamePortals}
                      stages={stages}
                      setStages={setStages}
                      dailyChallenges={dailyChallenges}
                      setDailyChallenges={setDailyChallenges}
                      dailyChallengeConfig={activeDailyChallenge}
                      onBroadcastNotification={(notif) => {
                        setLiveToastNotification(notif);
                      }}
                      triggerAlert={triggerAlert}
                      siteSettings={siteSettings}
                      setSiteSettings={setSiteSettings}
                      homeAnnouncements={homeAnnouncements}
                      setHomeAnnouncements={setHomeAnnouncements}
                      homeStats={homeStats}
                      setHomeStats={setHomeStats}
                      faqs={faqs}
                      setFaqs={setFaqs}
                      passwordResetRequests={passwordResetRequests}
                      setPasswordResetRequests={setPasswordResetRequests}
                      prizes={prizes}
                      setPrizes={setPrizes}
                      paymentSettings={paymentSettings}
                      setPaymentSettings={setPaymentSettings}
                      paymentTransactions={paymentTransactions}
                      setPaymentTransactions={setPaymentTransactions}
                      onNavigate={(tab) => handleTabChange(tab)}
                    />
                  </AdminErrorBoundary>
                ) : (
                  <>
                    {(activeTab === 'Journey' || activeTab === 'Profile') && (
                      <JourneyView 
                        currentUser={currentUser}
                        stages={stages}
                        siteSettings={siteSettings}
                        dailyChallengeConfig={activeDailyChallenge}
                        showMapBackground={activeTab === 'Journey'}
                        groups={groups}
                        medals={medals}
                        userMedals={userMedals}
                        initialOpenProfile={activeTab === 'Profile'}
                        onEnterDashboard={(stageId) => {
                          handleTabChange('Dashboard');
                        }}
                        onNavigateTab={(tab) => {
                          handleTabChange(tab);
                        }}
                        triggerAlert={triggerAlert}
                        onOpenProfile={() => setShowProfileModal(true)}
                        onOpenNotifications={() => setShowNotificationCenter(true)}
                        onUpdateAvatar={(newUrl) => {
                          if (currentUser) {
                            const updated = { ...currentUser, avatar_url: newUrl };
                            setCurrentUser(updated);
                            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                            saveUserProgressToSupabase(updated);
                          }
                        }}
                        onStageCompleted={(stageId, earnedPoints) => {
                          if (currentUser) {
                            const currentCompleted = Array.isArray(currentUser.completed_stages) ? currentUser.completed_stages : [];
                            const newCompleted = currentCompleted.includes(stageId) ? currentCompleted : [...currentCompleted, stageId];
                            const newPoints = (currentUser.points || 0) + earnedPoints;
                            const newLevel = Math.max(1, Math.floor(newPoints / 500) + 1);
                            const updated: User = {
                              ...currentUser,
                              completed_stages: newCompleted,
                              points: newPoints,
                              level: newLevel
                            };
                            setCurrentUser(updated);
                            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                            saveUserProgressToSupabase(updated);
                          }
                        }}
                        onAwardDailyPoints={(pts) => {
                          if (currentUser) {
                            const newPoints = Math.max(0, (currentUser.points || 0) + pts);
                            const newLevel = Math.max(1, Math.floor(newPoints / 500) + 1);
                            const updated: User = {
                              ...currentUser,
                              points: newPoints,
                              level: newLevel
                            };
                            setCurrentUser(updated);
                            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                            saveUserProgressToSupabase(updated);
                          }
                        }}
                      />
                    )}

                    {(activeTab === 'Rewards' || activeTab === 'Prizes' || activeTab === 'RewardsLeaderboard' || activeTab === 'Leaderboard') && (
                      <PrizesPointsView 
                        currentUser={currentUser}
                        users={users}
                        groups={groups}
                        medals={medals}
                        userMedals={userMedals}
                        prizes={prizes}
                        initialSubTab={activeTab === 'Leaderboard' || activeTab === 'RewardsLeaderboard' ? 'leaderboard' : 'prizes'}
                        triggerAlert={triggerAlert}
                        onNavigate={(tab) => handleTabChange(tab)}
                      />
                    )}

                    {activeTab === 'Vitrin' && (
                      <VitrinView 
                        currentUser={currentUser}
                        posts={vitrinPosts}
                        setPosts={setVitrinPosts}
                        commentsMap={vitrinCommentsMap}
                        triggerAlert={triggerAlert}
                        onNavigate={(tab) => handleTabChange(tab)}
                      />
                    )}

                    {activeTab === 'Dashboard' && (
                      <DashboardView 
                        currentUser={currentUser!}
                        users={users}
                        groups={groups}
                        missions={missions}
                        submissions={submissions}
                        announcements={announcements}
                        news={news}
                        stages={stages}
                        medals={medals}
                        userMedals={userMedals}
                        onNavigate={(tab) => handleTabChange(tab)}
                        onOpenSquadModal={() => setShowSquadModal(true)}
                      />
                    )}

                    {activeTab === 'Wallet' && currentUser && (
                      <WalletTransfersView
                        currentUser={currentUser}
                        paymentTransactions={paymentTransactions}
                        paymentSettings={paymentSettings}
                        triggerAlert={triggerAlert}
                        onNavigate={(tab) => handleTabChange(tab)}
                        onAddTransaction={(tx) => setPaymentTransactions(prev => [tx, ...prev])}
                      />
                    )}

                    {activeTab === 'Missions' && (
                      <MissionsView 
                        currentUser={currentUser!}
                        missions={missions}
                        submissions={submissions}
                        setSubmissions={setSubmissions}
                        triggerAlert={triggerAlert}
                        onNavigate={(tab) => handleTabChange(tab)}
                      />
                    )}

                    {activeTab === 'Trainings' && (
                      <TrainingsView 
                        currentUser={currentUser!}
                        trainings={trainings}
                        onNavigate={(tab) => handleTabChange(tab)}
                      />
                    )}

                    {activeTab === 'Profile' && (
                      <ProfileView 
                        currentUser={currentUser!}
                        groups={groups}
                        medals={medals}
                        userMedals={userMedals}
                        onNavigate={(tab) => handleTabChange(tab)}
                        triggerAlert={triggerAlert}
                      />
                    )}

                    {activeTab === 'Chat' && (
                      <div className="w-full max-w-4xl mx-auto h-[calc(100vh-170px)] min-h-[520px] flex flex-col">
                        <GroupChatPanel 
                          currentUser={currentUser}
                          users={users}
                          setUsers={setUsers}
                          setGroups={setGroups}
                          groups={groups}
                          groupJoinRequests={groupJoinRequests}
                          setGroupJoinRequests={setGroupJoinRequests}
                          onOpenSquadModal={() => setShowSquadModal(true)}
                          isModal
                          mobileMode
                        />
                      </div>
                    )}
                  </>
                )}
              </Suspense>
            </main>

            {/* Squad Management Modal for Commanders */}
            <Suspense fallback={null}>
              {showSquadModal && currentUser && (
                <SquadManagementModal 
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  users={users}
                  setUsers={setUsers}
                  groups={groups}
                  setGroups={setGroups}
                  groupJoinRequests={groupJoinRequests}
                  setGroupJoinRequests={setGroupJoinRequests}
                  onClose={() => setShowSquadModal(false)}
                  triggerAlert={triggerAlert}
                />
              )}

              {/* Profile & Avatar Selection Modal */}
              {showProfileModal && currentUser && (
                <ProfileModal 
                  isOpen={showProfileModal}
                  onClose={() => setShowProfileModal(false)}
                  currentUser={currentUser}
                  onUpdateAvatar={(newUrl) => {
                    const updated = { ...currentUser, avatar_url: newUrl };
                    setCurrentUser(updated);
                    setUsers(users.map(u => u.id === updated.id ? updated : u));
                  }}
                  medals={medals}
                  userMedals={userMedals}
                  triggerAlert={triggerAlert}
                  onNavigateTab={(tab) => handleTabChange(tab)}
                />
              )}

              {/* Clash of Clans Style Commander Onboarding Tutorial */}
              {showOnboardingTutorial && guideConfig?.isEnabled !== false && (
                <OnboardingCommanderTutorial 
                  currentUser={currentUser}
                  guideConfig={guideConfig}
                  onComplete={() => setShowOnboardingTutorial(false)}
                  onNavigateTab={(tab) => handleTabChange(tab)}
                />
              )}
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChatRoomModal && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowChatRoomModal(false)}
          >
            <motion.div
              className="relative h-[min(86vh,720px)] w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-400/50 bg-[#071126] shadow-[0_0_55px_rgba(34,211,238,0.3)]"
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={event => event.stopPropagation()}
            >
              <Suspense fallback={<div className="p-8 text-center text-cyan-300">در حال بارگذاری چت روم...</div>}>
                <GroupChatPanel
                  currentUser={currentUser}
                  users={users}
                  setUsers={setUsers}
                  setGroups={setGroups}
                  groups={groups}
                  groupJoinRequests={groupJoinRequests}
                  setGroupJoinRequests={setGroupJoinRequests}
                  onOpenSquadModal={() => {
                    setShowChatRoomModal(false);
                    setShowSquadModal(true);
                  }}
                  isModal
                  onClose={() => setShowChatRoomModal(false)}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Floating Android Mobile Bottom Navigation (فقط در پنل کاربری و پنل ادمین — در صفحه اول سایت و صفحات عمومی نمایش داده نمی‌شود) */}
      <AnimatePresence>
        {Boolean(
          currentUser && 
          !showAuthScreen &&
          !isModalActive && 
          !showNotificationCenter && 
          !showGamePortal && 
          !showSquadModal && 
          !showProfileModal && 
          !showOnboardingTutorial &&
          (isAdminMode || activeTab === 'Admin' || !['Home', 'Support', 'About', 'Contact', 'Rules'].includes(activeTab))
        ) && (
          <motion.div
            key="android-bottom-nav-container"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-0 inset-x-0 z-40 pointer-events-auto"
          >
            <BottomNavigation 
              activeTab={isAdminMode ? 'Admin' : activeTab}
              setActiveTab={(tab) => {
                setIsAdminMode(tab === 'Admin');
                handleTabChange(tab);
              }}
              currentUser={currentUser}
              isAdminMode={isAdminMode}
              setIsAdminMode={setIsAdminMode}
              campaignTheme={campaignTheme}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Real-Time Live Notification Floating Toast */}
      <LiveNotificationToast 
        notification={liveToastNotification}
        onDismiss={() => setLiveToastNotification(null)}
        onOpenCenter={() => {
          setLiveToastNotification(null);
          setShowNotificationCenter(true);
        }}
        onActionClick={(tab) => {
          if (liveToastNotification && currentUser) {
            setNotifications(prev => prev.map(n => 
              n.id === liveToastNotification.id && !n.is_read_by.includes(currentUser.id)
                ? { ...n, is_read_by: [...n.is_read_by, currentUser.id] }
                : n
            ));
          }
          setLiveToastNotification(null);
          handleTabChange(tab);
        }}
      />

      {/* Global Comprehensive Notification Center Modal */}
      <Suspense fallback={null}>
        {showNotificationCenter && (
          <NotificationCenterModal 
            isOpen={showNotificationCenter}
            onClose={() => setShowNotificationCenter(false)}
            notifications={notifications}
            setNotifications={setNotifications}
            currentUser={currentUser}
            onNavigate={(tab) => {
              setShowNotificationCenter(false);
              handleTabChange(tab);
            }}
          />
        )}

        {/* Game / Campaign Selection Portal Modal */}
        <GameSelectionPortalModal 
          isOpen={showGamePortal}
          onClose={handleCloseGamePortal}
          currentUser={currentUser}
          onSelectWarRoom={handleSelectWarRoom}
          campaignTheme={campaignTheme}
          portals={gamePortals}
          isMandatory={isGamePortalMandatory}
        />

        {mustChangePassword && currentUser && (
          <ForcePasswordChangeModal
            userName={`${currentUser.first_name} ${currentUser.last_name}`}
            isDefault={true}
            onChanged={() => {
              setMustChangePassword(false);
              triggerAlert('رمز عبور با موفقیت تغییر یافت.');
            }}
            onLogout={handleLogout}
          />
        )}
      </Suspense>

      {/* Global Fixed Persistent Music Player Bar (Visible across all tabs and views) */}
      <AnimatePresence>
        {!(isModalActive || showNotificationCenter || showGamePortal || showSquadModal || showProfileModal || showOnboardingTutorial) && (
          <motion.div
            key="persistent-music-bar-container"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-0 left-0 z-40 pointer-events-auto"
          >
            <PersistentMusicBar 
              hasBottomNav={Boolean(!showAuthScreen && currentUser)} 
              isGirls={isGirlsTheme}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Offline Status & Background Queue Synchronization Banner */}
      <OfflineSyncBanner />

    </div>
  );
}
