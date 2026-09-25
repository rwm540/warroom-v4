import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  BookOpen, 
  Compass, 
  ArrowLeft, 
  Award, 
  Star, 
  Bell, 
  X, 
  FileText, 
  Flame, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Navigation,
  User as UserIcon,
  HelpCircle,
  Building,
  Camera,
  Activity,
  Zap,
  Radio,
  Video,
  Upload,
  Link as LinkIcon,
  Clock,
  Send,
  MessageSquare,
  Volume2,
  Check,
  Trophy,
  Play,
  Share2,
  Book,
  Home,
  MessageCircle,
  MapPin,
  Copy,
  ShieldCheck,
  Phone,
  School,
  Bookmark
} from 'lucide-react';
import { User, Mission, MissionSubmission, Group, Medal, UserMedal, JourneyStage, DailyChallengeConfig } from '../types';
import { formatToPersianDigits } from '../utils/jalali';
import { getSavedPostIds } from '../data/vitrinData';
import { getStageBadge } from '../data/stageBadges';
import { initialJourneyStages } from '../data/initialStages';
import SavedVitrinReelsModal from './SavedVitrinReelsModal';
import StageQuizModal from './StageQuizModal';
import DailyChallengeModal from './DailyChallengeModal';
import { getAvatarsByGender, getDefaultAvatar } from '../data/avatars';

// Project commander character avatars
import womanCommanderAvatar from '../assets/images/avatar/woman/Commander_giving_orders_2K_202608210108.jpeg';
import maleCommanderAvatar from '../assets/images/avatar/male/Commander_in_tactical_uniform_ready_202608210056.jpeg';

// پس‌زمینه تاکتیکی نقشه و مراحل بازی (تصویر بهینه‌شده وب‌پک)
const tacticalMapBg = '/images/backgrounds/tactical_war_map_background.webp';

interface JourneyViewProps {
  currentUser: User | null;
  stages?: JourneyStage[];
  onEnterDashboard: (stageId?: string) => void;
  triggerAlert: (msg: string) => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onNavigateTab?: (tab: string) => void;
  missions?: Mission[];
  submissions?: MissionSubmission[];
  onSubmitMission?: (missionId: string, note: string, fileName: string) => void;
  groups?: Group[];
  medals?: Medal[];
  userMedals?: UserMedal[];
  onUpdateAvatar?: (avatarUrl: string) => void;
  initialOpenProfile?: boolean;
  /** نقشه تاکتیکی فقط داخل بورد مسیر بازی نمایش داده شود؛ پس‌زمینه کل صفحه همیشه همان بنفش قبلی است */
  showMapBackground?: boolean;
  onStageCompleted?: (stageId: string, earnedPoints: number) => void;
  onAwardDailyPoints?: (points: number) => void;
  dailyChallengeConfig?: DailyChallengeConfig | null;
}

export default function JourneyView({
  currentUser,
  stages: stagesProp = [],
  onEnterDashboard,
  triggerAlert,
  onOpenNotifications,
  onOpenProfile,
  onNavigateTab,
  missions = [],
  submissions = [],
  onSubmitMission,
  groups = [],
  medals = [],
  userMedals = [],
  onUpdateAvatar,
  initialOpenProfile = false,
  showMapBackground = true,
  onStageCompleted,
  onAwardDailyPoints,
  dailyChallengeConfig
}: JourneyViewProps) {
  const [selectedStage, setSelectedStage] = useState<JourneyStage | null>(null);
  const [activeTabSub, setActiveTabSub] = useState<'journey' | 'journal' | 'prayer'>('journey');
  const [widgetNote, setWidgetNote] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalNote, setJournalNote] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Saved Vitrin Posts Reels Modal state
  const [showSavedReelsModal, setShowSavedReelsModal] = useState(false);
  const [savedPostsCount, setSavedPostsCount] = useState(0);

  // Daily Challenge Modal State
  const [showDailyChallengeModal, setShowDailyChallengeModal] = useState(false);
  const todayKey = new Date().toISOString().slice(0, 10);
  const [isDailyChallengeDone, setIsDailyChallengeDone] = useState<boolean>(() => {
    return localStorage.getItem(`warroom_daily_challenge_${todayKey}`) === 'true';
  });

  useEffect(() => {
    const handleUpdate = () => {
      const tKey = new Date().toISOString().slice(0, 10);
      setIsDailyChallengeDone(localStorage.getItem(`warroom_daily_challenge_${tKey}`) === 'true');
    };
    window.addEventListener('warroom_daily_challenge_updated', handleUpdate);
    window.addEventListener('warroom_daily_challenge_deleted', handleUpdate);
    return () => {
      window.removeEventListener('warroom_daily_challenge_updated', handleUpdate);
      window.removeEventListener('warroom_daily_challenge_deleted', handleUpdate);
    };
  }, []);

  // Integrated Profile state
  const [showProfileDrawer, setShowProfileDrawer] = useState(initialOpenProfile);
  const [copiedCode, setCopiedCode] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState<'dossier' | 'medals' | 'avatar' | 'saved'>('dossier');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(currentUser?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80');

  const isGirls = currentUser?.gender === 'دختر' || localStorage.getItem('hisstory_theme_mode') === 'girls';

  // Map Scroll and Navigation Refs
  const mapScrollContainerRef = useRef<HTMLDivElement>(null);
  const activeStageRef = useRef<HTMLDivElement>(null);

  // Notify global app layout whenever any modal inside JourneyView is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      selectedStage || 
      showGuideModal || 
      showJournalModal || 
      showSavedReelsModal || 
      showDailyChallengeModal || 
      showProfileDrawer
    );

    if (isAnyModalOpen) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [selectedStage, showGuideModal, showJournalModal, showSavedReelsModal, showDailyChallengeModal, showProfileDrawer]);

  useEffect(() => {
    const ids = getSavedPostIds(currentUser?.id);
    setSavedPostsCount(ids.length);
  }, [currentUser, showSavedReelsModal, showProfileDrawer]);

  // Saved posts count effect
  useEffect(() => {
    const ids = getSavedPostIds(currentUser?.id);
    setSavedPostsCount(ids.length);
  }, [currentUser, showSavedReelsModal, showProfileDrawer]);

  const scrollToActiveStage = () => {
    if (activeStageRef.current) {
      activeStageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToTopStage = () => {
    if (mapScrollContainerRef.current) {
      mapScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottomStage = () => {
    if (mapScrollContainerRef.current) {
      mapScrollContainerRef.current.scrollTo({ 
        top: mapScrollContainerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  const PREDEFINED_AVATARS = getAvatarsByGender(currentUser?.gender, isGirls ? 'girls' : 'boys');

  const userGroup = groups.find(g => g.id === currentUser?.group_id);
  const earnedUserMedals = userMedals.filter(um => um.personal_code === currentUser?.personal_code);

  const handleCopyPersonalCode = () => {
    if (!currentUser?.personal_code) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(currentUser.personal_code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentUser.personal_code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    triggerAlert('کد ۹ رقمی شما کپی شد.');
  };

  const handleSaveAvatar = (url: string) => {
    setSelectedAvatarUrl(url);
    if (onUpdateAvatar) {
      onUpdateAvatar(url);
    }
    triggerAlert('آواتار پروفایل شما با موفقیت به‌روزرسانی شد.');
  };

  const handleAvatarUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 1 MB limit
    const MAX_SIZE_BYTES = 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE_BYTES) {
      triggerAlert('خطا: سایز تصویر آواتار نباید بیشتر از ۱ مگابایت باشد.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleSaveAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // مراحل نقشه بازی منحصراً از دیتابیس ابری Supabase دریافت می‌شود
  const stages: JourneyStage[] = stagesProp !== undefined ? stagesProp : initialJourneyStages;

  // محاسبه پویای وضعیت هر مرحله بر اساس پیشرفت و امتیازات واقعی رزمنده در Supabase
  const userCompletedStageIds = Array.isArray(currentUser?.completed_stages) ? currentUser.completed_stages : [];
  const userPoints = currentUser?.points || 0;

  const activeStages = useMemo(() => {
    return stages.map((stage, idx) => {
      const isCompletedByUser = userCompletedStageIds.includes(stage.id);
      let dynamicStatus: 'completed' | 'in_progress' | 'locked' = stage.status;

      if (currentUser) {
        if (isCompletedByUser) {
          dynamicStatus = 'completed';
        } else {
          // اولین مرحله یا مرحله‌ای که پیش‌نیاز آن تکمیل شده، در حال انجام است
          const prevStage = idx > 0 ? stages[idx - 1] : null;
          const prevCompleted = !prevStage || userCompletedStageIds.includes(prevStage.id);
          if (prevCompleted || userPoints >= stage.requiredPoints) {
            dynamicStatus = 'in_progress';
          } else {
            dynamicStatus = 'locked';
          }
        }
      }
      return { ...stage, status: dynamicStatus };
    });
  }, [stages, userCompletedStageIds, userPoints, currentUser]);

  const completedStagesCount = activeStages.filter(s => s.status === 'completed').length;
  const pathProgressPercent = activeStages.length > 0 
    ? Math.min(100, Math.round((completedStagesCount / activeStages.length) * 100)) 
    : 0;

  // Track map container scroll to show animated scroll guide when overflowed (> 7 stages)
  const [canScrollDown, setCanScrollDown] = useState<boolean>(false);

  // Dynamic calculations for map height & S-curve road path
  const stageCount = activeStages.length;
  const stageGapY = stageCount <= 7 ? 75 : 85;
  const mapCanvasHeight = stageCount <= 7 
    ? Math.max(480, stageCount * stageGapY + 50)
    : stageCount * stageGapY + 60;

  const checkMapScroll = React.useCallback(() => {
    const el = mapScrollContainerRef.current;
    if (!el || stageCount <= 7) {
      setCanScrollDown(false);
      return;
    }
    const isOverflowing = el.scrollHeight > el.clientHeight + 15;
    const isNotAtBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 25;
    setCanScrollDown(isOverflowing && isNotAtBottom);
  }, [stageCount]);

  useEffect(() => {
    // Check scroll state after mount & image rendering
    const timer = setTimeout(checkMapScroll, 100);
    const el = mapScrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkMapScroll);
      window.addEventListener('resize', checkMapScroll);
    }
    return () => {
      clearTimeout(timer);
      if (el) {
        el.removeEventListener('scroll', checkMapScroll);
        window.removeEventListener('resize', checkMapScroll);
      }
    };
  }, [stageCount, checkMapScroll]);

  const roadPathD = React.useMemo(() => {
    if (stageCount <= 0) return '';
    if (stageCount === 1) return `M 200 40 L 200 ${mapCanvasHeight - 40}`;

    const points = Array.from({ length: stageCount }, (_, i) => {
      const y = 45 + i * stageGapY;
      const x = i === 0 ? 200 : i % 2 === 1 ? 120 : 280;
      return { x, y };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = (prev.y + curr.y) / 2;
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [stageCount, stageGapY, mapCanvasHeight]);

  // رندر آیکون/بج تصویری مرحله (تصویر سفارشی ادمین یا بج تصویری استاندارد مرحله)
  const renderStageIcon = (iconName: string, status: string, customIconUrl?: string) => {
    const badgeSrc = customIconUrl || getStageBadge(iconName);
    return (
      <img
        src={badgeSrc}
        alt="نشان مرحله"
        draggable={false}
        className={`w-full h-full object-cover rounded-full transition-all duration-300 ${
          status === 'locked' ? 'grayscale opacity-60' : 'opacity-100'
        }`}
      />
    );
  };

  const handleStageClick = (stage: JourneyStage) => {
    setSelectedStage(stage);
  };

  const handleFileUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0].name);
      triggerAlert(`فایل "${e.target.files[0].name}" با موفقیت بارگذاری شد.`);
    }
  };

  // Full Multi-Directional Pan / Drag-to-Scroll with Window Listeners
  const journeyContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingJourneyRef = useRef(false);
  const dragStartJourneyPos = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingJourneyRef.current) return;
      const el = journeyContainerRef.current;
      if (!el) return;
      e.preventDefault();
      const dx = e.clientX - dragStartJourneyPos.current.x;
      const dy = e.clientY - dragStartJourneyPos.current.y;
      el.scrollLeft = dragStartJourneyPos.current.scrollLeft - dx;
      el.scrollTop = dragStartJourneyPos.current.scrollTop - dy;
    };

    const handleWindowMouseUp = () => {
      isDraggingJourneyRef.current = false;
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  const handleJourneyMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="button"], .cursor-pointer')) return;

    const el = journeyContainerRef.current;
    if (!el) return;
    isDraggingJourneyRef.current = true;
    dragStartJourneyPos.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop
    };
  };

  return (
    <div 
      ref={journeyContainerRef}
      className={`w-full h-full overflow-x-hidden overflow-y-auto touch-pan-y relative flex flex-col p-1 sm:p-2 dir-rtl font-sans selection:bg-amber-500 selection:text-black transition-colors duration-700 ${
        isGirls ? 'girls-atmosphere-bg text-pink-50' : 'boys-atmosphere-bg text-slate-100'
      }`}
    >
      
      {/* پس‌زمینه تمام‌صفحه نقشه حذف شد — کل صفحه مسیر همان پس‌زمینه بنفش قبلی (atmosphere-bg) را دارد؛ نقشه فقط داخل بورد مسیر بازی است */}

      <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 pb-36 md:pb-16 px-1.5 sm:px-3 relative z-10">

        {/* ========================================================================= */}
        {/* 1. STICKY TOP HUD BAR: User Profile Avatar & 4 Stats Cards */}
        {/* ========================================================================= */}
        <div className={`sticky top-0 z-30 w-full p-1.5 sm:p-2 rounded-2xl backdrop-blur-xl border shadow-xl flex items-center justify-between gap-2 sm:gap-3 transition-all duration-300 ${
          isGirls 
            ? 'bg-[#150220]/92 border-fuchsia-500/35 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(255,19,137,0.2)]'
            : 'bg-[#060c20]/92 border-blue-500/35 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(37,99,235,0.2)]'
        }`}>

          {/* Stats Bar (4 Columns: سطح شما, امتیاز کل, نشان‌ها, درصد مسیر) — کاملاً پویا از Supabase */}
          <section className="flex-1 grid grid-cols-4 gap-1.5 sm:gap-2 bg-[#0d1524]/90 border border-slate-800/80 rounded-xl p-1.5 sm:p-2 backdrop-blur-md shadow-md">
            
            {/* 1. سطح شما */}
            <div className="flex flex-col items-center justify-center text-center p-1 rounded-lg bg-[#090e1a]/60 border border-slate-800/40">
              <span className="text-[10px] text-slate-400 font-medium mb-0.5">سطح شما</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[10px] font-mono">🔰</span>
                <strong className="text-xs sm:text-sm md:text-base font-black text-white font-mono">
                  {formatToPersianDigits(currentUser?.level || 1)}
                </strong>
              </div>
            </div>

            {/* 2. امتیاز کل */}
            <div className="flex flex-col items-center justify-center text-center p-1 rounded-lg bg-[#090e1a]/60 border border-slate-800/40">
              <span className="text-[10px] text-slate-400 font-medium mb-0.5">امتیاز کل</span>
              <div className="flex items-center gap-1 text-amber-400">
                <Star size={13} className="fill-amber-400 shrink-0" />
                <strong className="text-xs sm:text-sm md:text-base font-black font-mono">
                  {formatToPersianDigits(currentUser?.points || 0)}
                </strong>
              </div>
            </div>

            {/* 3. نشان‌ها */}
            <div 
              onClick={() => {
                setProfileSubTab('medals');
                setShowProfileDrawer(true);
              }}
              className="flex flex-col items-center justify-center text-center p-1 rounded-lg bg-[#090e1a]/60 border border-slate-800/40 cursor-pointer hover:border-cyan-500/50 transition group"
              title="مشاهده نشان‌ها و مدال‌ها در پروفایل"
            >
              <span className="text-[10px] text-slate-400 font-medium mb-0.5 group-hover:text-cyan-300 transition">نشان‌ها</span>
              <div className="flex items-center gap-1 text-cyan-400">
                <Trophy size={13} className="shrink-0 group-hover:scale-110 transition" />
                <strong className="text-xs sm:text-sm md:text-base font-black font-mono">
                  {formatToPersianDigits(earnedUserMedals.length)}
                </strong>
              </div>
            </div>

            {/* 4. درصد مسیر */}
            <div className="flex flex-col items-center justify-center text-center p-1 rounded-lg bg-[#090e1a]/60 border border-slate-800/40">
              <span className="text-[10px] text-slate-400 font-medium mb-0.5">درصد مسیر</span>
              <div className="flex items-center gap-1 text-emerald-400">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeDasharray={`${pathProgressPercent}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
                <strong className="text-xs sm:text-sm font-black font-mono">
                  {formatToPersianDigits(pathProgressPercent)}٪
                </strong>
              </div>
            </div>

          </section>

          {/* User Profile Avatar (Positioned on the LEFT side of the HUD box) */}
          <button 
            onClick={() => {
              setProfileSubTab('dossier');
              setShowProfileDrawer(true);
            }}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 overflow-hidden border-2 shadow-md shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
              isGirls ? 'border-pink-400 shadow-[0_0_12px_rgba(255,19,137,0.5)]' : 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
            }`}
            title="مشاهده و ویرایش پرونده رزمنده"
          >
            <img 
              src={currentUser?.avatar_url || (isGirls ? womanCommanderAvatar : maleCommanderAvatar)} 
              alt={currentUser?.first_name || 'کاربر'} 
              className="w-full h-full object-cover object-top rounded-full"
            />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. TACTICAL DAILY CHALLENGE BANNER (چالش تاکتیکی روزانه اتاق جنگ)         */}
        {/* ========================================================================= */}
        {dailyChallengeConfig && dailyChallengeConfig.isActive !== false && Boolean(dailyChallengeConfig.title) && (
          <div className="w-full">
            <button
              type="button"
              onClick={() => setShowDailyChallengeModal(true)}
              className={`w-full p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 text-right shadow-xl group cursor-pointer ${
                isDailyChallengeDone
                  ? 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400 text-emerald-200'
                  : isGirls
                  ? 'bg-gradient-to-r from-fuchsia-950/70 via-[#180a2b] to-slate-900 border-fuchsia-500/60 hover:border-fuchsia-400 text-white shadow-[0_0_25px_rgba(236,72,153,0.25)]'
                  : 'bg-gradient-to-r from-amber-950/70 via-[#111936] to-slate-900 border-amber-500/60 hover:border-amber-400 text-white shadow-[0_0_25px_rgba(245,158,11,0.25)]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDailyChallengeDone
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : isGirls
                    ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                }`}>
                  <Flame size={22} className={isDailyChallengeDone ? '' : 'animate-bounce'} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition truncate">
                      {dailyChallengeConfig.title}
                    </span>
                    {isDailyChallengeDone ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        <CheckCircle2 size={12} />
                        انجام شده امروز
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shrink-0">
                        <Zap size={12} />
                        آماده پاسخگویی
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                    {dailyChallengeConfig.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-left font-mono hidden sm:block">
                  <span className="text-xs sm:text-sm font-black text-amber-400">
                    +{formatToPersianDigits(dailyChallengeConfig.pointsReward || 150)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">کریستال پاداش</span>
                </div>
                <div className={`p-2 rounded-xl border transition ${
                  isDailyChallengeDone 
                    ? 'bg-emerald-900/40 border-emerald-600 text-emerald-300' 
                    : 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md group-hover:scale-105'
                }`}>
                  <ArrowLeft size={16} />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. MAIN INTERACTIVE SERPENTINE JOURNEY MAP (Fixed Background, Smooth Scroll) */}
        {/* ========================================================================= */}
        <div className="relative w-full max-w-md mx-auto my-3 rounded-3xl overflow-hidden border border-amber-500/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-950">
          
          {/* 1. Static Fixed Tactical Map Background */}
          {showMapBackground && (
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-100 z-0"
              style={{ backgroundImage: `url(${tacticalMapBg})` }}
            >
              <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px]" />
              <div className="absolute inset-0 ring-2 ring-inset ring-amber-400/40 rounded-3xl pointer-events-none" />
            </div>
          )}

          {/* Top Fade Vignette for smooth hidden scroll blending */}
          {canScrollDown && (
            <div className="pointer-events-none absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-slate-950/80 to-transparent z-20 rounded-t-3xl" />
          )}

          {/* Bottom Fade Vignette */}
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent z-20 rounded-b-3xl" />

          {/* Animated Scroll Hint Guide Badge (Appears when stages overflow) */}
          <AnimatePresence>
            {canScrollDown && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                onClick={() => {
                  if (mapScrollContainerRef.current) {
                    mapScrollContainerRef.current.scrollBy({ top: 160, behavior: 'smooth' });
                  }
                }}
                className="absolute bottom-3 inset-x-0 mx-auto w-fit z-30 cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/60 text-amber-300 text-[10px] sm:text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.35)] backdrop-blur-md hover:bg-slate-800 transition dir-rtl select-none"
              >
                <motion.span
                  animate={{ y: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                >
                  <ChevronDown size={14} className="text-amber-400 shrink-0" />
                </motion.span>
                <span>برای مشاهده مراحل بیشتر اسکرول کنید</span>
                <motion.span
                  animate={{ y: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                >
                  <ChevronDown size={14} className="text-amber-400 shrink-0" />
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. Path Container for Stage Nodes & Animated Highway (Scrollable ONLY if > 7 stages) */}
          <div 
            ref={mapScrollContainerRef}
            className={`relative z-10 w-full py-4 px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
              stageCount > 7 
                ? 'max-h-[580px] sm:max-h-[620px] overflow-y-auto scroll-smooth' 
                : 'overflow-hidden'
            }`}
          >
            <div 
              className="relative w-full mx-auto flex flex-col justify-between items-center"
              style={{ minHeight: `${mapCanvasHeight}px` }}
            >
              {/* SVG Winding Road Path with Textured Glowing Curves */}
              {stageCount > 0 && (
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox={`0 0 400 ${mapCanvasHeight}`} 
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="roadGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                      <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0.35" />
                    </linearGradient>

                    <linearGradient id="roadBorder" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.75" />
                      <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#475569" stopOpacity="0.4" />
                    </linearGradient>

                    <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Road Glow Aura */}
                  <path
                    d={roadPathD}
                    fill="none"
                    stroke="url(#roadGlow)"
                    strokeWidth="70"
                    strokeLinecap="round"
                    filter="url(#glowFilter)"
                    opacity="0.35"
                  />

                  {/* Main Asphalt Road Base */}
                  <path
                    d={roadPathD}
                    fill="none"
                    stroke="#172236"
                    strokeWidth="50"
                    strokeLinecap="round"
                  />

                  {/* Road Outer Golden/Emerald Luminous Edge Borders */}
                  <path
                    d={roadPathD}
                    fill="none"
                    stroke="url(#roadBorder)"
                    strokeWidth="52"
                    strokeLinecap="round"
                    opacity="0.3"
                  />

                  {/* Center Dashed Highway Line */}
                  <path
                    d={roadPathD}
                    fill="none"
                    stroke="#facc15"
                    strokeWidth="2"
                    strokeDasharray="7 9"
                    opacity="0.85"
                  />
                </svg>
              )}

              {/* Stages Embedded Along the S-Curve Road */}
              {stageCount === 0 ? (
                <div className="flex flex-col items-center justify-center my-auto py-16 px-6 text-center text-slate-300 space-y-3">
                  <Compass size={44} className="text-amber-400 animate-pulse" />
                  <h3 className="font-black text-sm text-white">هیچ مرحله‌ای در نقشه ثبت نشده است</h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    مدیر سامانه می‌تواند از بخش مدیریت مراحل جدید اضافه کند.
                  </p>
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col justify-between items-center py-2 z-10">
                  {activeStages.map((stage, idx) => {
                    const isCompleted = stage.status === 'completed';
                    const isInProgress = stage.status === 'in_progress';
                    const isLocked = stage.status === 'locked';

                    // Balanced horizontal offsets matching the S-curves
                    const xOffset = idx === 0 
                      ? 'translate-x-0' 
                      : idx % 2 === 1 
                      ? '-translate-x-16 sm:-translate-x-20' 
                      : 'translate-x-14 sm:translate-x-18';

                    return (
                      <React.Fragment key={stage.id}>
                        <motion.div
                          ref={isInProgress ? activeStageRef : undefined}
                          initial={{ scale: 0.7, opacity: 0, y: 20 }}
                          animate={{ 
                            scale: 1, 
                            opacity: 1, 
                            y: isInProgress ? [0, -6, 0] : [0, -3, 0] 
                          }}
                          transition={{ 
                            scale: { delay: idx * 0.04, duration: 0.35 },
                            opacity: { delay: idx * 0.04, duration: 0.35 },
                            y: { repeat: Infinity, duration: isInProgress ? 2 : 3.5, ease: "easeInOut", delay: idx * 0.15 }
                          }}
                          whileHover={{ scale: 1.12, zIndex: 40 }}
                          whileTap={{ scale: 0.94 }}
                          className={`relative flex items-center justify-center ${xOffset} my-1`}
                        >
                          {/* Stage Interactive Node Button */}
                          <div 
                            onClick={() => handleStageClick(stage)}
                            className="flex flex-row items-center gap-1.5 sm:gap-2 cursor-pointer group select-none"
                          >
                            {/* Circular Stage Emblem (نشان تصویری مرحله) */}
                            <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                              isCompleted 
                                ? 'bg-[#06241a] border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.7)]'
                                : isInProgress
                                ? 'bg-[#2b1e06] border-2 border-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.95)]'
                                : 'bg-[#101726] border-2 border-slate-700/80 shadow-[0_0_10px_rgba(0,0,0,0.6)] opacity-90'
                            }`}>
                              
                              {/* Halo Pulse Ring for Active Stage */}
                              {isInProgress && (
                                <motion.span
                                  animate={{ scale: [1, 1.45, 1], opacity: [0.75, 0, 0.75] }}
                                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                  className="absolute inset-0 rounded-full border-2 border-amber-400 pointer-events-none"
                                />
                              )}

                              {/* Halo Pulse for Completed Stage */}
                              {isCompleted && (
                                <motion.span
                                  animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
                                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: idx * 0.2 }}
                                  className="absolute inset-0 rounded-full border border-emerald-400 pointer-events-none"
                                />
                              )}

                              {/* Status Badge Image / Icon */}
                              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                {renderStageIcon(stage.iconName, stage.status, stage.customIconUrl)}
                              </div>

                              {/* Top Number Indicator Pin */}
                              <motion.div 
                                animate={isInProgress ? { scale: [1, 1.15, 1] } : {}}
                                transition={isInProgress ? { repeat: Infinity, duration: 1.2 } : {}}
                                className={`absolute -top-1 -right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center font-mono text-[8px] sm:text-[9px] font-black border shadow ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-slate-950 border-slate-950'
                                    : isInProgress
                                    ? 'bg-amber-500 text-slate-950 border-slate-950'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {formatToPersianDigits(stage.number)}
                              </motion.div>
                            </div>

                            {/* Attached Label Pill */}
                            <motion.div 
                              whileHover={{ x: -2 }}
                              className={`px-2.5 py-1 rounded-xl backdrop-blur-md border transition-all text-right shadow-md flex flex-col justify-center min-w-[95px] max-w-[135px] ${
                                isCompleted
                                  ? 'bg-[#081f18]/90 border-emerald-500/50 group-hover:border-emerald-400'
                                  : isInProgress
                                  ? 'bg-[#231805]/95 border-amber-500/70 group-hover:border-amber-400'
                                  : 'bg-[#0d1424]/90 border-slate-800 group-hover:border-slate-600'
                              }`}
                            >
                              <h4 className="font-black text-[11px] sm:text-xs text-white leading-tight truncate">
                                {stage.title}
                              </h4>
                              
                              <div className="flex items-center gap-1 mt-0.5">
                                {isCompleted && (
                                  <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                                    <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                                    <span>تکمیل شد</span>
                                  </span>
                                )}
                                {isInProgress && (
                                  <span className="text-[9px] font-bold text-amber-300 flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                                    <span>در حال انجام</span>
                                  </span>
                                )}
                                {isLocked && (
                                  <span className="text-[9px] font-medium text-slate-400 flex items-center gap-0.5">
                                    <Lock size={9} className="text-slate-500 shrink-0" />
                                    <span>قفل شده</span>
                                  </span>
                                )}
                              </div>
                            </motion.div>

                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE STAGE DETAILS & 4-OPTION QUIZ MODAL WITH TIMER & MEDIA     */}
      {/* ========================================================================= */}
      <StageQuizModal
        isOpen={Boolean(selectedStage)}
        onClose={() => setSelectedStage(null)}
        stage={selectedStage}
        currentUser={currentUser}
        triggerAlert={triggerAlert}
        onStageCompleted={(stageId, earnedPoints) => {
          onStageCompleted?.(stageId, earnedPoints);
          triggerAlert(`مرحله با موفقیت فتح شد و ${formatToPersianDigits(earnedPoints)} کریستال پاداش به رزمنده تعلق گرفت.`);
        }}
      />

      {/* ========================================================================= */}
      {/* 5. JOURNAL MODAL (دفترچه سفر)                                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showJournalModal && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b1222] border border-amber-500/40 rounded-3xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-2xl my-auto max-h-[85vh] sm:max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-base">
                  <BookOpen size={20} />
                  <span>دفترچه خاطرات و دل‌نوشته‌های سفر</span>
                </div>
                <button 
                  onClick={() => setShowJournalModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                احساسات، تجربیات و دل‌نوشته‌های معنوی خود در طول این مسیر را ثبت کنید:
              </p>

              <textarea
                rows={5}
                value={journalNote}
                onChange={(e) => setJournalNote(e.target.value)}
                placeholder="امروز در گام خدمت، لحظات به یاد ماندنی رقم خورد..."
                className="w-full bg-[#070b14] border border-slate-700/80 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />

              <button
                onClick={() => {
                  triggerAlert('یادداشت شما با موفقیت در دفترچه سفر ذخیره شد.');
                  setShowJournalModal(false);
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2.5 rounded-xl transition shadow-lg"
              >
                ثبت در دفترچه سفر
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. ROUTE GUIDE MODAL (راهنمای مسیر)                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 dir-rtl overflow-hidden">
            {/* Backdrop - Separate layer for clean blur and click-to-close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuideModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Card - Fixed center, internal scroll only */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#0f172a] border border-cyan-500/50 rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-[0_0_60px_rgba(6,182,212,0.3)] relative z-10 overflow-y-auto max-h-[92vh] scrollbar-hide"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div className="flex items-center gap-4 text-cyan-400">
                  <div className="p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-700/50 shadow-lg shadow-cyan-950/40">
                    <Compass size={26} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">راهنمای نقشه و دستورات فرمانده</h2>
                    <p className="text-[11px] text-slate-400 mt-1">پروتکل عملیاتی هفت‌خوان مقاومت</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGuideModal(false)}
                  className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer hover:bg-slate-800"
                  title="بستن پنجره"
                >
                  <X size={20} />
                </button>
              </div>

              {/* COMMANDER AVATAR & TAC DEBRIEFING CARD */}
              <div className="p-5 rounded-[2rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-slate-800 relative overflow-hidden shadow-2xl space-y-5">
                <div className="flex items-center gap-4.5">
                  {/* Commander Avatar Frame */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-[2px] bg-gradient-to-tr from-amber-400 via-cyan-400 to-emerald-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
                    <div className="w-full h-full bg-[#050b18] rounded-[14px] overflow-hidden relative">
                      <img 
                        src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80" 
                        alt="فرمانده قرارگاه تاکتیکی" 
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0f172a] animate-pulse" />
                  </div>

                  {/* Commander Identity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        فرماندهی ارشد عملیات
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight">سردار ستاد قرارگاه تاکتیکی</h3>
                    <p className="text-[11px] text-cyan-400 font-bold">راهبر عالی عملیات‌های هفت‌خوان</p>
                  </div>
                </div>

                {/* Briefing Speech Bubble */}
                <div className="bg-slate-950/60 p-4.5 rounded-2xl border border-slate-800/80 text-slate-300 leading-relaxed space-y-2.5">
                  <div className="text-amber-400 font-black flex items-center gap-2 text-[11px]">
                    <Sparkles size={14} />
                    <span>دستورالعمل تاکتیکی فرمانده:</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-justify">
                    «رزمندگان غیور! نقشه هفت‌خوان پیش روی شما، میدان فتح و محک آمادگی است. با کلیک بر روی آیکون‌های مسیر، وارد آزمون‌های زمان‌دار می‌شوید. زمان محدود است؛ با تمرکز و مشورت، گزینه‌های صحیح را انتخاب کنید.»
                  </p>
                </div>
              </div>

              {/* Status Legend */}
              <div className="space-y-3.5 px-1">
                <span className="font-bold text-slate-500 block text-[11px] uppercase tracking-wider">وضعیت المان‌های نقشه:</span>
                
                <div className="grid gap-2.5 text-xs">
                  <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
                    <span className="text-emerald-500 text-xl leading-none">●</span>
                    <span className="text-slate-300"><strong>مراحل فتح‌شده:</strong> مأموریت با موفقیت به پایان رسیده است.</span>
                  </div>

                  <div className="flex items-center gap-4 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                    <span className="text-amber-500 text-xl leading-none animate-pulse">●</span>
                    <span className="text-amber-200"><strong>مرحله جاری:</strong> مرحله فعال و آماده شروع عملیات جدید.</span>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60 opacity-60">
                    <span className="text-slate-500 text-xl leading-none">🔒</span>
                    <span className="text-slate-400"><strong>مراحل قفل‌شده:</strong> پس از پیروزی در مرحله قبل باز می‌شوند.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm py-4.5 rounded-[1.5rem] transition shadow-2xl shadow-cyan-900/40 cursor-pointer active:scale-[0.98]"
              >
                تایید و ورود به نقشه عملیاتی
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* ========================================================================= */}
        {/* INTEGRATED PROFILE & DOSSIER MODAL (پروفایل و نشان‌های رزمنده)             */}
        {/* ========================================================================= */}
      <AnimatePresence>
        {showProfileDrawer && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-[#090e1c] border border-cyan-500/40 rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-5 shadow-2xl relative my-auto max-h-[85vh] sm:max-h-[88vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-950/80 text-cyan-400 border border-cyan-700/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <UserIcon size={22} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">
                      شناسنامه و پروفایل رزمنده
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      مشاهده اطلاعات هویتی، آمار مأموریت‌ها و نشان‌های افتخار
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileDrawer(false)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-Tabs: شناسنامه و اطلاعات / مدال‌ها و نشان‌ها / تغییر آواتار / ذخیره‌های ویترین */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/90 p-1 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setProfileSubTab('dossier')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    profileSubTab === 'dossier'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span className="hidden sm:inline">شناسنامه</span>
                  <span className="sm:hidden">هویت</span>
                </button>
                <button
                  onClick={() => setProfileSubTab('medals')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    profileSubTab === 'medals'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Award size={14} />
                  <span>مدال‌ها ({formatToPersianDigits(earnedUserMedals.length || 4)})</span>
                </button>
                <button
                  onClick={() => setProfileSubTab('avatar')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    profileSubTab === 'avatar'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserIcon size={14} />
                  <span className="hidden sm:inline">آواتار تاکتیکی</span>
                  <span className="sm:hidden">آواتار</span>
                </button>

              </div>

              {/* TAB 1: DOSSIER (شناسنامه) */}
              {profileSubTab === 'dossier' && (
                <div className="space-y-4">
                  {/* Personal Code Card with 1-Click Copy */}
                  <div className="bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 block">
                        کد ۹ رقمی رزمنده (شناسه اختصاصی):
                      </span>
                      <strong className="text-xl font-black font-mono tracking-widest text-white">
                        {currentUser?.personal_code || '987654321'}
                      </strong>
                    </div>
                    <button
                      onClick={handleCopyPersonalCode}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition shadow-sm"
                    >
                      {copiedCode ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                      <span>{copiedCode ? 'کپی شد!' : 'کپی کد'}</span>
                    </button>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-slate-400 text-[10px]">نام و نام خانوادگی</span>
                      <p className="font-bold text-white">{currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'علی رضایی'}</p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-slate-400 text-[10px]">نقش عملیاتی</span>
                      <p className="font-bold text-cyan-300">
                        {currentUser?.role === 'admin' ? 'فرمانده ارشد / مدیر کل' : currentUser?.role === 'leader' ? 'فرمانده جوخه' : 'رزمنده میدانی'}
                      </p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-slate-400 text-[10px]">جوخه عملیاتی</span>
                      <p className="font-bold text-amber-300">
                        {userGroup ? userGroup.name : 'جوخه صاعقه ۱۲ (تهران)'}
                      </p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-slate-400 text-[10px]">شماره تماس</span>
                      <p className="font-mono text-slate-200">{currentUser?.phone || '۰۹۱۲۳۴۵۶۷۸۹'}</p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-slate-400 text-[10px]">استان و شهر</span>
                      <p className="font-bold text-white">{currentUser?.province || 'تهران'} - {currentUser?.city || 'تهران'}</p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-slate-400 text-[10px]">مدرسه و پایه</span>
                      <p className="font-bold text-white">{currentUser?.school_name || 'دبیرستان شهید بهشتی'} ({currentUser?.grade || 'پایه دهم'})</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDALS & HONORS */}
              {profileSubTab === 'medals' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    نشان‌های افتخار کسب شده در جریان مراحل و مأموریت‌های استراتژیک:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'm1', title: 'مدال طلای نصر کشوری', desc: 'کسب رتبه برتر در مأموریت‌های جهادی', icon: '🥇', color: 'border-amber-500/50 bg-amber-950/30 text-amber-300' },
                      { id: 'm2', title: 'نشان تکاور بصیرت', desc: 'پاسخ کامل به چالش‌های فکری و تاریخی', icon: '🎖️', color: 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300' },
                      { id: 'm3', title: 'مدال پیشگام رسانه', desc: 'ثبت و ارسال گزارش‌های میدانی تصویری', icon: '⭐', color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300' },
                      { id: 'm4', title: 'نشان شجاعت و ایثار', desc: 'همکاری ویژه تیمی و انسجام گروهی', icon: '🛡️', color: 'border-purple-500/50 bg-purple-950/30 text-purple-300' }
                    ].map(medal => (
                      <div key={medal.id} className={`p-3 rounded-2xl border ${medal.color} flex items-center gap-3`}>
                        <span className="text-2xl">{medal.icon}</span>
                        <div>
                          <h4 className="text-xs font-black">{medal.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{medal.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: AVATAR SELECTOR */}
              {profileSubTab === 'avatar' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300">
                      تصویر آواتار دلخواه خود را جهت نمایش در نقشه بازی و جوخه انتخاب یا آپلود فرمایید:
                    </p>
                    <span className="text-[10px] font-bold text-amber-400 shrink-0">حداکثر ۱ مگابایت</span>
                  </div>

                  {/* Custom Upload Card */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                        <Upload size={18} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-200">آپلود آواتار اختصاصی</h5>
                        <p className="text-[10px] text-slate-400">فرمت‌های تصویری (کمتر از ۱ مگابایت)</p>
                      </div>
                    </div>

                    <label className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs cursor-pointer transition shadow-md flex items-center gap-1.5 shrink-0">
                      <Upload size={13} />
                      <span>انتخاب فایل</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUploadFile} 
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PREDEFINED_AVATARS.map(avatar => {
                      const isSelected = (selectedAvatarUrl || currentUser?.avatar_url) === avatar.url;
                      return (
                        <div
                          key={avatar.id}
                          onClick={() => handleSaveAvatar(avatar.url)}
                          className={`relative rounded-2xl p-2 cursor-pointer border transition text-center space-y-1.5 ${
                            isSelected
                              ? isGirls
                                ? 'border-pink-400 bg-pink-950/60 shadow-[0_0_15px_rgba(255,19,137,0.4)]'
                                : 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-14 h-14 rounded-full mx-auto overflow-hidden ring-2 ring-slate-700">
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover object-top" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-300 block truncate">
                            {avatar.name}
                          </span>
                          {isSelected && (
                            <span className={`absolute top-1.5 right-1.5 p-1 rounded-full ${isGirls ? 'bg-pink-500' : 'bg-cyan-500'} text-slate-950`}>
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}



              {/* Close / Action footer */}
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  امتیاز کل: {formatToPersianDigits(currentUser?.points || 0)} کریستال
                </span>
                <button
                  onClick={() => setShowProfileDrawer(false)}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition"
                >
                  بازگشت به نقشه بازی
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* ========================================================================= */}
      {/* 9. DAILY CHALLENGE MODAL (مودال اختصاصی چالش روزانه)                       */}
      {/* ========================================================================= */}
      <DailyChallengeModal
        isOpen={showDailyChallengeModal}
        onClose={() => setShowDailyChallengeModal(false)}
        triggerAlert={triggerAlert}
        dailyChallengeConfig={dailyChallengeConfig}
        onAwardPoints={(pts) => {
          setIsDailyChallengeDone(true);
          onAwardDailyPoints?.(pts);
          triggerAlert(`چالش روزانه تکمیل شد و ${formatToPersianDigits(pts)} کریستال به امتیازات شما در دیتابیس افزوده شد.`);
        }}
      />

    </div>
  );
}
