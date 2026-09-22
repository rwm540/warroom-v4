import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Users, 
  Target, 
  BookOpen, 
  Award, 
  HelpCircle, 
  Megaphone, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  Send, 
  Filter, 
  ShieldAlert, 
  Download, 
  Newspaper, 
  Check, 
  Home, 
  ArrowLeft, 
  ArrowRight, 
  Headphones, 
  MessageSquare, 
  CheckCircle, 
  RefreshCw, 
  AlertTriangle, 
  Bell, 
  Radio, 
  Volume2, 
  Zap, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Music,
  LayoutDashboard,
  Activity,
  Star,
  Eye,
  ChevronRight,
  ChevronLeft,
  Gamepad2,
  Rocket,
  Lock,
  Link as LinkIcon,
  Copy,
  UserPlus,
  Phone,
  MapPin,
  Calendar,
  Building,
  Hash,
  UserCheck,
  KeyRound,
  Shield,
  Video,
  Upload,
  ArrowUp,
  ArrowDown,
  Image,
  Trophy,
  Gem,
  Gift,
  Play,
  Layout,
  X,
  Heart,
  Loader2,
  CreditCard
} from 'lucide-react';
import { defaultHomeButtons } from '../data/home';
import { VitrinPost, buildVitrinPostFromSubmission } from '../data/vitrinData';
import { uploadToStorage, isSupabaseEnabled, sha256Hex } from '../lib/supabaseData';
import {
  probeBackend,
  getBackendStatus,
  adminCreateUser,
  adminUpdateUser,
  adminResetUserPassword,
} from '../lib/backendApi';
import { PasswordResetRequest } from '../types';
import { showInternalToast, confirmInternal } from '../lib/appDialog';
import AdminSoundtrackManager from './AdminSoundtrackManager';
import PasswordResetsAdmin from './PasswordResetsAdmin';
import AdminPaymentsPanel from './AdminPaymentsPanel';
import AdminChatRoomsPanel from './AdminChatRoomsPanel';
import DashboardView from './DashboardView';
import ElementorVisualEditorModal from './ElementorVisualEditorModal';
import PersianDatePicker from './PersianDatePicker';
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
  TicketType, 
  TicketStatus,
  SubmissionStatus,
  AppNotification,
  NotificationType,
  NotificationTarget,
  GamePortal,
  RoleType,
  Gender,
  EducationLevel,
  TargetRole,
  HomeButtonConfig,
  JourneyStage,
  StageQuizQuestion,
  DailyChallengeConfig,
  PrizeItem,
  PaymentSettings,
  PaymentTransaction
} from '../types';
import { formatToPersianDigits } from '../utils/jalali';
import { playNotificationSound } from '../utils/audioAlert';

/** تولید رمز عبور قوی در حالت محلی (بدون بک‌اند) — کاراکترهای مشابه‌نما حذف شده‌اند */
function generateSecurePasswordLocal(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%+=';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  missions: Mission[];
  setMissions: React.Dispatch<React.SetStateAction<Mission[]>>;
  submissions: MissionSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<MissionSubmission[]>>;
  trainings: Training[];
  setTrainings: React.Dispatch<React.SetStateAction<Training[]>>;
  medals: Medal[];
  setMedals: React.Dispatch<React.SetStateAction<Medal[]>>;
  userMedals: UserMedal[];
  setUserMedals: React.Dispatch<React.SetStateAction<UserMedal[]>>;
  tickets: SupportTicket[];
  setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  replies: SupportReply[];
  setReplies: React.Dispatch<React.SetStateAction<SupportReply[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  news: News[];
  setNews: React.Dispatch<React.SetStateAction<News[]>>;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  // 🆕 ویترین آثار — همگام با Supabase
  vitrinPosts: VitrinPost[];
  setVitrinPosts: React.Dispatch<React.SetStateAction<VitrinPost[]>>;
  // 🆕 درگاه‌های بازی — همگام با Supabase
  gamePortals: GamePortal[];
  setGamePortals: React.Dispatch<React.SetStateAction<GamePortal[]>>;
  // 🆕 مراحل نقشه بازی و چالش روزانه — همگام با Supabase
  stages?: JourneyStage[];
  setStages?: React.Dispatch<React.SetStateAction<JourneyStage[]>>;
  dailyChallengeConfig?: DailyChallengeConfig;
  setDailyChallengeConfig?: React.Dispatch<React.SetStateAction<DailyChallengeConfig>>;
  onBroadcastNotification?: (notif: AppNotification) => void;
  triggerAlert: (msg: string) => void;
  siteSettings: any;
  setSiteSettings: (settings: any) => void;
  homeAnnouncements: any[];
  setHomeAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  homeStats: any;
  setHomeStats: (stats: any) => void;
  faqs: any[];
  setFaqs: React.Dispatch<React.SetStateAction<any[]>>;
  /** 🛡️ درخواست‌های تغییر رمز (حالت محلی — همگام با Supabase در صورت پیکربندی) */
  passwordResetRequests: PasswordResetRequest[];
  setPasswordResetRequests: React.Dispatch<React.SetStateAction<PasswordResetRequest[]>>;
  prizes?: PrizeItem[];
  setPrizes?: React.Dispatch<React.SetStateAction<PrizeItem[]>>;
  paymentSettings: PaymentSettings;
  setPaymentSettings: (settings: PaymentSettings) => void;
  paymentTransactions: PaymentTransaction[];
  onNavigate?: (tab: string) => void;
}

export default function AdminPanel({
  currentUser,
  users,
  setUsers,
  groups,
  setGroups,
  missions,
  setMissions,
  submissions,
  setSubmissions,
  trainings,
  setTrainings,
  medals,
  setMedals,
  userMedals,
  setUserMedals,
  tickets,
  setTickets,
  replies,
  setReplies,
  announcements,
  setAnnouncements,
  news,
  setNews,
  notifications = [],
  setNotifications,
  vitrinPosts = [],
  setVitrinPosts,
  gamePortals = [],
  setGamePortals,
  stages = [],
  setStages,
  dailyChallengeConfig,
  setDailyChallengeConfig,
  onBroadcastNotification,
  triggerAlert,
  siteSettings,
  setSiteSettings,
  homeAnnouncements,
  setHomeAnnouncements,
  homeStats,
  setHomeStats,
  faqs,
  setFaqs,
  passwordResetRequests = [],
  setPasswordResetRequests,
  prizes = [],
  setPrizes,
  paymentSettings,
  setPaymentSettings,
  paymentTransactions,
  onNavigate
}: AdminPanelProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<
    'overview' | 'submissions' | 'users' | 'missions' | 'trainings' | 'medals' | 'tickets' | 'news' | 'site_editor' | 'notifications' | 'chat_control' | 'soundtracks' | 'portals' | 'vitrins' | 'password_resets' | 'stage_builder' | 'prizes' | 'payments'
  >('submissions');

  // 🛡️ وضعیت بک‌اند امن (برای مدیریت امن رمز کاربران)
  const [backendReady, setBackendReady] = useState<boolean>(() => Boolean(getBackendStatus()?.available));
  useEffect(() => {
    let mounted = true;
    probeBackend().then((status) => { if (mounted) setBackendReady(Boolean(status.available)); });
    return () => { mounted = false; };
  }, []);

  // رمز یک‌بارمصرف نمایش‌داده‌شده پس از ایجاد/بازنشانی کاربر (هرگز ذخیره نمی‌شود)
  const [oneTimeCredential, setOneTimeCredential] = useState<{ title: string; password: string } | null>(null);
  // 🎁 PRIZES & AWARDS MANAGEMENT STATE
  const [showPrizeModal, setShowPrizeModal] = useState<boolean>(false);
  const [editingPrize, setEditingPrize] = useState<PrizeItem | null>(null);
  const [prizeForm, setPrizeForm] = useState<{
    title: string;
    category: string;
    requiredPoints: number;
    imageUrl: string;
    stockCount: number;
    tag: string;
  }>({
    title: '',
    category: 'gaming',
    requiredPoints: 5000,
    imageUrl: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600&auto=format&fit=crop&q=80',
    stockCount: 10,
    tag: 'جایزه ویژه'
  });

  const handleOpenCreatePrize = () => {
    setEditingPrize(null);
    setPrizeForm({
      title: '',
      category: 'gaming',
      requiredPoints: 5000,
      imageUrl: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600&auto=format&fit=crop&q=80',
      stockCount: 10,
      tag: 'جایزه ویژه'
    });
    setShowPrizeModal(true);
  };

  const handleOpenEditPrize = (prize: PrizeItem) => {
    setEditingPrize(prize);
    setPrizeForm({
      title: prize.title,
      category: prize.category,
      requiredPoints: prize.requiredPoints,
      imageUrl: prize.imageUrl,
      stockCount: prize.stockCount,
      tag: prize.tag
    });
    setShowPrizeModal(true);
  };

  const handleSavePrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setPrizes) return;

    if (!prizeForm.title.trim()) {
      triggerAlert('لطفاً عنوان جایزه را وارد نمایید.');
      return;
    }

    if (editingPrize) {
      setPrizes(prev => prev.map(p => p.id === editingPrize.id ? {
        ...p,
        title: prizeForm.title,
        category: prizeForm.category,
        requiredPoints: Number(prizeForm.requiredPoints) || 0,
        imageUrl: prizeForm.imageUrl,
        stockCount: Number(prizeForm.stockCount) || 1,
        tag: prizeForm.tag
      } : p));
      triggerAlert(`جایزه «${prizeForm.title}» به‌روزرسانی شد.`);
    } else {
      const newPrize: PrizeItem = {
        id: `prize_${Date.now()}`,
        title: prizeForm.title,
        category: prizeForm.category,
        requiredPoints: Number(prizeForm.requiredPoints) || 0,
        imageUrl: prizeForm.imageUrl,
        stockCount: Number(prizeForm.stockCount) || 1,
        tag: prizeForm.tag,
        isAvailable: true
      };
      setPrizes(prev => [newPrize, ...prev]);
      triggerAlert(`جایزه جدید «${prizeForm.title}» اضافه گردید.`);
    }

    setShowPrizeModal(false);
  };

  const handleDeletePrize = (id: string, title: string) => {
    if (!setPrizes) return;
    confirmInternal(`آیا از حذف جایزه «${title}» اطمینان دارید؟`, {
      title: 'حذف جایزه',
      onConfirm: () => {
        setPrizes(prev => prev.filter(p => p.id !== id));
        triggerAlert(`جایزه «${title}» حذف شد.`);
      }
    });
  };

  const handleClearAllPrizes = () => {
    if (!setPrizes) return;
    confirmInternal('آیا از حذف تمامی جوایز اطمینان دارید؟ با این کار ویترین جوایز کاملاً خالی خواهد شد.', {
      title: 'پاک‌سازی تمامی جوایز',
      onConfirm: () => {
        setPrizes([]);
        triggerAlert('تمامی جوایز با موفقیت حذف شدند.');
      }
    });
  };
  const portals = gamePortals;
  const setPortals = setGamePortals;
  const [showPortalModal, setShowPortalModal] = useState<boolean>(false);
  const [editingPortal, setEditingPortal] = useState<GamePortal | null>(null);
  const [portalForm, setPortalForm] = useState<{
    title: string;
    subtitle: string;
    description: string;
    link: string;
    status: 'active' | 'coming_soon' | 'disabled';
    badgeText: string;
    targetAudience: 'all' | 'girls' | 'boys';
    tag: string;
  }>({
    title: '',
    subtitle: '',
    description: '',
    link: '',
    status: 'active',
    badgeText: 'فعال • در حال برگزاری',
    targetAudience: 'all',
    tag: 'درگاه جدید'
  });

  const handleOpenCreatePortal = () => {
    setEditingPortal(null);
    setPortalForm({
      title: '',
      subtitle: '',
      description: '',
      link: 'https://',
      status: 'active',
      badgeText: 'فعال • در حال برگزاری',
      targetAudience: 'all',
      tag: 'سامانه بازی'
    });
    setShowPortalModal(true);
  };

  const handleOpenEditPortal = (portal: GamePortal) => {
    setEditingPortal(portal);
    setPortalForm({
      title: portal.title,
      subtitle: portal.subtitle || '',
      description: portal.description || '',
      link: portal.link || '',
      status: portal.status,
      badgeText: portal.badgeText || '',
      targetAudience: portal.targetAudience || 'all',
      tag: portal.tag || ''
    });
    setShowPortalModal(true);
  };

  const handleSavePortalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalForm.title.trim()) {
      triggerAlert('خطا: عنوان درگاه نمی‌تواند خالی باشد.');
      return;
    }

    let updatedList: GamePortal[];
    if (editingPortal) {
      updatedList = portals.map(p => p.id === editingPortal.id ? {
        ...p,
        title: portalForm.title.trim(),
        subtitle: portalForm.subtitle.trim(),
        description: portalForm.description.trim(),
        link: portalForm.link.trim(),
        status: portalForm.status,
        badgeText: portalForm.badgeText.trim() || (portalForm.status === 'active' ? 'فعال • در حال برگزاری' : 'به‌زودی'),
        targetAudience: portalForm.targetAudience,
        tag: portalForm.tag.trim()
      } : p);
      triggerAlert(`درگاه «${portalForm.title}» با موفقیت بروزرسانی شد.`);
    } else {
      const newPortalObj: GamePortal = {
        id: `portal_${Date.now()}`,
        title: portalForm.title.trim(),
        subtitle: portalForm.subtitle.trim(),
        description: portalForm.description.trim(),
        link: portalForm.link.trim(),
        status: portalForm.status,
        badgeText: portalForm.badgeText.trim() || (portalForm.status === 'active' ? 'فعال • در حال برگزاری' : 'به‌زودی'),
        targetAudience: portalForm.targetAudience,
        tag: portalForm.tag.trim() || 'سامانه جدید',
        featured: false
      };
      updatedList = [...portals, newPortalObj];
      triggerAlert(`درگاه جدید «${portalForm.title}» ایجاد و اضافه شد.`);
    }

    setPortals(updatedList);
    setShowPortalModal(false);
  };

  const handleDeletePortal = (id: string, title: string) => {
    confirmInternal(`آیا از حذف درگاه «${title}» اطمینان دارید؟`, {
      title: 'تأیید حذف درگاه',
      confirmText: 'حذف درگاه',
      onConfirm: () => {
        const updatedList = portals.filter(p => p.id !== id);
        setPortals(updatedList);
        triggerAlert(`درگاه «${title}» حذف شد.`);
      }
    });
  };

  const handleTogglePortalStatus = (id: string) => {
    const updatedList = portals.map(p => {
      if (p.id === id) {
        const nextStatus: 'active' | 'coming_soon' = p.status === 'active' ? 'coming_soon' : 'active';
        return {
          ...p,
          status: nextStatus,
          badgeText: nextStatus === 'active' ? 'فعال • در حال برگزاری' : 'به‌زودی • فصل جدید'
        };
      }
      return p;
    });
    setPortals(updatedList);
    triggerAlert('وضعیت فعال‌سازی درگاه تغییر یافت.');
  };

  // ==========================================================================
  // 🎖️ VITRIN (SHOWCASE) MANAGEMENT STATE — ویترین آثار (همگام با Supabase)
  // ==========================================================================
  const [showVitrinModal, setShowVitrinModal] = useState<boolean>(false);
  const [editingVitrinPost, setEditingVitrinPost] = useState<VitrinPost | null>(null);
  const [vitrinForm, setVitrinForm] = useState<{
    title: string;
    description: string;
    authorName: string;
    squadName: string;
    stageTag: string;
    badge: string;
    mediaType: 'image' | 'video';
    mediaUrl: string;
    videoSourceUrl: string;
    authorAvatar: string;
    likesCount: number;
    ratingAverage: number;
  }>({
    title: '',
    description: '',
    authorName: '',
    squadName: '',
    stageTag: '',
    badge: '',
    mediaType: 'image',
    mediaUrl: '',
    videoSourceUrl: '',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    likesCount: 0,
    ratingAverage: 5
  });
  const [vitrinMediaUploading, setVitrinMediaUploading] = useState<boolean>(false);
  const vitrinMediaInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleOpenCreateVitrin = () => {
    setEditingVitrinPost(null);
    setVitrinForm({
      title: '',
      description: '',
      authorName: '',
      squadName: '',
      stageTag: '',
      badge: '',
      mediaType: 'image',
      mediaUrl: '',
      videoSourceUrl: '',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      likesCount: 0,
      ratingAverage: 5
    });
    setShowVitrinModal(true);
  };

  const handleOpenEditVitrin = (post: VitrinPost) => {
    setEditingVitrinPost(post);
    setVitrinForm({
      title: post.title,
      description: post.description,
      authorName: post.authorName,
      squadName: post.squadName,
      stageTag: post.stageTag,
      badge: post.badge || '',
      mediaType: post.mediaType,
      mediaUrl: post.mediaUrl,
      videoSourceUrl: post.videoSourceUrl || '',
      authorAvatar: post.authorAvatar,
      likesCount: post.likesCount,
      ratingAverage: post.ratingAverage
    });
    setShowVitrinModal(true);
  };

  // آپلود فایل رسانه (تصویر/ویدیو) به Supabase Storage و درج URL
  const handleVitrinMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isSupabaseEnabled) {
      triggerAlert('آپلود فایل نیازمند اتصال Supabase است. لطفاً به‌جای آن لینک مستقیم رسانه را وارد کنید.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      triggerAlert('حجم فایل نباید از ۲۵ مگابایت بیشتر باشد.');
      return;
    }
    setVitrinMediaUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const safeName = file.name.replace(/[^\w\u0600-\u06FF.-]/g, '_');
      const path = `vitrin/${Date.now()}_${safeName}`;
      const result = await uploadToStorage(path, file);
      if (result) {
        setVitrinForm(prev => prev.mediaType === 'video'
          ? { ...prev, videoSourceUrl: result.publicUrl, mediaUrl: result.publicUrl }
          : { ...prev, mediaUrl: result.publicUrl });
        triggerAlert('رسانه با موفقیت در Supabase Storage آپلود شد.');
      } else {
        triggerAlert('آپلود رسانه ناموفق بود. لطفا از لینک مستقیم استفاده کنید.');
      }
    } finally {
      setVitrinMediaUploading(false);
      if (vitrinMediaInputRef.current) vitrinMediaInputRef.current.value = '';
    }
  };

  const handleSaveVitrinPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitrinForm.title.trim()) {
      triggerAlert('خطا: عنوان اثر نمی‌تواند خالی باشد.');
      return;
    }
    if (vitrinForm.mediaType === 'image' && !vitrinForm.mediaUrl.trim()) {
      triggerAlert('خطا: برای اثر تصویری، تصویر (آپلود یا لینک) الزامی است.');
      return;
    }
    if (vitrinForm.mediaType === 'video' && !vitrinForm.videoSourceUrl.trim() && !vitrinForm.mediaUrl.trim()) {
      triggerAlert('خطا: برای اثر ویدیویی، ویدیو (آپلود یا لینک) الزامی است.');
      return;
    }

    if (editingVitrinPost) {
      setVitrinPosts(prev => prev.map(p => p.id === editingVitrinPost.id ? {
        ...p,
        title: vitrinForm.title.trim(),
        description: vitrinForm.description.trim(),
        authorName: vitrinForm.authorName.trim() || 'رزمنده اتاق جنگ',
        squadName: vitrinForm.squadName.trim() || 'ستاد اتاق جنگ',
        stageTag: vitrinForm.stageTag.trim() || 'ویترین',
        badge: vitrinForm.badge.trim() || undefined,
        mediaType: vitrinForm.mediaType,
        mediaUrl: vitrinForm.mediaUrl.trim(),
        videoSourceUrl: vitrinForm.mediaType === 'video' ? vitrinForm.videoSourceUrl.trim() : undefined,
        authorAvatar: vitrinForm.authorAvatar.trim() || p.authorAvatar,
        likesCount: Math.max(0, Number(vitrinForm.likesCount) || 0),
        ratingAverage: Math.min(5, Math.max(1, Number(vitrinForm.ratingAverage) || 5))
      } : p));
      triggerAlert(`اثر ویترین «${vitrinForm.title}» با موفقیت بروزرسانی شد و در Supabase ذخیره گردید.`);
    } else {
      const newPost: VitrinPost = {
        id: `vit_${Date.now()}`,
        authorName: vitrinForm.authorName.trim() || 'رزمنده اتاق جنگ',
        authorAvatar: vitrinForm.authorAvatar.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        squadName: vitrinForm.squadName.trim() || 'ستاد اتاق جنگ',
        title: vitrinForm.title.trim(),
        description: vitrinForm.description.trim(),
        mediaUrl: vitrinForm.mediaUrl.trim(),
        videoSourceUrl: vitrinForm.mediaType === 'video' ? vitrinForm.videoSourceUrl.trim() : undefined,
        mediaType: vitrinForm.mediaType,
        likesCount: Math.max(0, Number(vitrinForm.likesCount) || 0),
        isLikedByUser: false,
        ratingAverage: Math.min(5, Math.max(1, Number(vitrinForm.ratingAverage) || 5)),
        commentsCount: 0,
        stageTag: vitrinForm.stageTag.trim() || 'ویترین',
        badge: vitrinForm.badge.trim() || undefined,
        timeAgo: 'به تازگی',
        createdAtTimestamp: Date.now()
      };
      setVitrinPosts(prev => [newPost, ...prev]);
      triggerAlert(`ویترین جدید «${vitrinForm.title}» ایجاد شد و در Supabase ذخیره گردید.`);
    }
    setShowVitrinModal(false);
  };

  const handleDeleteVitrinPost = (post: VitrinPost) => {
    confirmInternal(`آیا از حذف اثر «${post.title}» از ویترین اطمینان دارید؟`, {
      title: 'تأیید حذف اثر ویترین',
      confirmText: 'حذف اثر',
      onConfirm: () => {
        setVitrinPosts(prev => prev.filter(p => p.id !== post.id));
        triggerAlert(`اثر «${post.title}» از ویترین حذف و از Supabase حذف گردید.`);
      }
    });
  };

  const handleMoveVitrinPost = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= vitrinPosts.length) return;
    setVitrinPosts(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // 🗺️ STAGE BUILDER & DAILY CHALLENGE STATES
  const [showStageModal, setShowStageModal] = useState<boolean>(false);
  const [editingStage, setEditingStage] = useState<JourneyStage | null>(null);
  const [showSqlScriptModal, setShowSqlScriptModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const [stageForm, setStageForm] = useState<{
    id: string;
    number: number;
    title: string;
    subtitle: string;
    status: 'completed' | 'in_progress' | 'locked';
    iconName: 'flag' | 'heart' | 'shield' | 'service' | 'users' | 'shrine' | 'star' | 'trophy' | string;
    customIconUrl: string;
    requiredPoints: number;
    description: string;
    missionsCount: number;
    completedMissions: number;
    xOffsetPercent: number;
    quizQuestions: StageQuizQuestion[];
  }>({
    id: '',
    number: 1,
    title: '',
    subtitle: '',
    status: 'locked',
    iconName: 'flag',
    customIconUrl: '',
    requiredPoints: 0,
    description: '',
    missionsCount: 1,
    completedMissions: 0,
    xOffsetPercent: 0,
    quizQuestions: []
  });

  // Daily Challenge State in Admin Panel
  const [dailyForm, setDailyForm] = useState<DailyChallengeConfig>(() => {
    return dailyChallengeConfig || {
      id: 'daily_challenge_main',
      title: 'چالش تاکتیکی روزانه',
      description: 'با پاسخ به این تست هوش عمیق، ۱۵۰ امتیاز پاداش دریافت کنید.',
      badge: 'tactical_badge',
      pointsReward: 150,
      question: 'اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟',
      questionText: 'اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟',
      options: [
        'داشتن تجهیزات مدرن',
        'اخلاص در نیت و خودسازی فردی',
        'شناخت رقبا',
        'شروع بدون برنامه‌ریزی'
      ],
      correctOptionIndex: 1,
      isActive: true
    };
  });

  useEffect(() => {
    if (dailyChallengeConfig) {
      setDailyForm(dailyChallengeConfig);
    }
  }, [dailyChallengeConfig]);

  const handleOpenAddStage = () => {
    setEditingStage(null);
    setStageForm({
      id: `s_${Date.now()}`,
      number: (stages?.length || 0) + 1,
      title: '',
      subtitle: '',
      status: 'locked',
      iconName: 'flag',
      customIconUrl: '',
      requiredPoints: ((stages?.length || 0) + 1) * 500,
      description: '',
      missionsCount: 2,
      completedMissions: 0,
      xOffsetPercent: (stages?.length || 0) % 2 === 0 ? 20 : -20,
      quizQuestions: []
    });
    setShowStageModal(true);
  };

  const handleOpenEditStage = (stg: JourneyStage) => {
    setEditingStage(stg);
    setStageForm({
      id: stg.id,
      number: stg.number,
      title: stg.title,
      subtitle: stg.subtitle || '',
      status: stg.status,
      iconName: stg.iconName || 'flag',
      customIconUrl: stg.customIconUrl || '',
      requiredPoints: stg.requiredPoints || 0,
      description: stg.description || '',
      missionsCount: stg.missionsCount || 1,
      completedMissions: stg.completedMissions || 0,
      xOffsetPercent: stg.xOffsetPercent || 0,
      quizQuestions: stg.quizQuestions || []
    });
    setShowStageModal(true);
  };

  const handleSaveStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageForm.title.trim()) {
      triggerAlert('خطا: عنوان مرحله الزامی است.');
      return;
    }

    const savedStage: JourneyStage = {
      id: stageForm.id || `s_${Date.now()}`,
      number: Number(stageForm.number) || 1,
      title: stageForm.title.trim(),
      subtitle: stageForm.subtitle.trim(),
      status: stageForm.status,
      iconName: stageForm.iconName,
      customIconUrl: stageForm.customIconUrl.trim() || undefined,
      requiredPoints: Number(stageForm.requiredPoints) || 0,
      description: stageForm.description.trim(),
      missionsCount: Number(stageForm.missionsCount) || 1,
      completedMissions: Number(stageForm.completedMissions) || 0,
      xOffsetPercent: Number(stageForm.xOffsetPercent) || 0,
      quizQuestions: stageForm.quizQuestions
    };

    if (setStages) {
      if (editingStage) {
        setStages(prev => prev.map(s => s.id === editingStage.id ? savedStage : s));
        triggerAlert(`مرحله «${savedStage.title}» با موفقیت ویرایش گردید.`);
      } else {
        setStages(prev => [...prev, savedStage]);
        triggerAlert(`مرحله جدید «${savedStage.title}» به مسیر بازی اضافه شد.`);
      }
    }
    setShowStageModal(false);
  };

  const handleDeleteStage = (stg: JourneyStage) => {
    confirmInternal(`آیا از حذف مرحله «${stg.title}» مطمئن هستید؟`, {
      title: 'تأیید حذف مرحله',
      confirmText: 'حذف مرحله',
      onConfirm: () => {
        if (setStages) {
          setStages(prev => prev.filter(s => s.id !== stg.id));
          triggerAlert(`مرحله «${stg.title}» حذف گردید.`);
        }
      }
    });
  };

  const handleSaveDailyChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (setDailyChallengeConfig) {
      setDailyChallengeConfig(dailyForm);
      triggerAlert('پیکربندی چالش روزانه با موفقیت در Supabase ذخیره گردید.');
    }
  };

  const handleStageIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 1 MB limit
    if (file.size > 1024 * 1024) {
      triggerAlert('خطا: سایز آیکون/تصویر مرحله نباید بیشتر از ۱ مگابایت باشد.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStageForm(prev => ({ ...prev, customIconUrl: reader.result as string }));
        triggerAlert('تصویر آیکون اختصاصی مرحله با موفقیت انتخاب شد.');
      }
    };
    reader.readAsDataURL(file);
  };

  // USER CRUD & DETAIL MODAL STATES
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUserDetail, setViewingUserDetail] = useState<User | null>(null);

  const [userForm, setUserForm] = useState<{
    first_name: string;
    last_name: string;
    national_code: string;
    phone: string;
    password: string;
    role: RoleType;
    gender: Gender;
    education_level: EducationLevel;
    grade: string;
    province: string;
    city: string;
    birth_date: string;
    school_name: string;
    personal_code: string;
    postal_code: string;
    address: string;
    points: number;
    level: number;
  }>({
    first_name: '',
    last_name: '',
    national_code: '',
    phone: '',
    password: '',
    role: 'user',
    gender: 'پسر',
    education_level: 'متوسطه اول',
    grade: 'هشتم',
    province: 'تهران',
    city: 'تهران',
    birth_date: '1388/01/01',
    school_name: '',
    personal_code: '',
    postal_code: '',
    address: '',
    points: 100,
    level: 1
  });

  const handleOpenAddUser = () => {
    setEditingUser(null);
    const randomCode = Math.floor(100000000 + Math.random() * 900000000).toString();
    setUserForm({
      first_name: '',
      last_name: '',
      national_code: '',
      phone: '09',
      password: '',
      role: 'user',
      gender: 'پسر',
      education_level: 'متوسطه اول',
      grade: 'هشتم',
      province: 'تهران',
      city: 'تهران',
      birth_date: '1388/01/01',
      school_name: 'مدرسه نمونه دولتی',
      personal_code: randomCode,
      postal_code: '',
      address: '',
      points: 100,
      level: 1
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      national_code: user.national_code || '',
      phone: user.phone || '',
      password: '',
      role: user.role || 'user',
      gender: user.gender || 'پسر',
      education_level: user.education_level || 'متوسطه اول',
      grade: user.grade || 'هشتم',
      province: user.province || 'تهران',
      city: user.city || 'تهران',
      birth_date: user.birth_date || '1388/01/01',
      school_name: user.school_name || '',
      personal_code: user.personal_code || '',
      postal_code: user.postal_code || '',
      address: user.address || '',
      points: user.points || 0,
      level: user.level || 1
    });
    setShowUserModal(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.first_name.trim() || !userForm.last_name.trim()) {
      triggerAlert('خطا: نام و نام خانوادگی کاربر الزامی است.');
      return;
    }

    /* ================= 🛡️ مسیر امن: عملیات روی سرور ================= */
    // اطمینان از مشخص بودن وضعیت بک‌اند پیش از انتخاب مسیر امن/محلی
    const status = await probeBackend();
    const secureMode = Boolean(status.available);
    if (secureMode !== backendReady) setBackendReady(secureMode);

    if (secureMode) {
      if (editingUser) {
        const res = await adminUpdateUser(editingUser.id, {
          first_name: userForm.first_name.trim(),
          last_name: userForm.last_name.trim(),
          phone: userForm.phone.trim(),
          role: userForm.role,
          gender: userForm.gender,
          education_level: userForm.education_level,
          grade: userForm.grade.trim(),
          province: userForm.province.trim(),
          city: userForm.city.trim(),
          school_name: userForm.school_name.trim(),
          address: userForm.address.trim(),
          points: Number(userForm.points) || 0,
          level: Number(userForm.level) || 1
        });
        if (!res.ok) {
          triggerAlert(res.error?.message || 'ویرایش کاربر ناموفق بود.');
          return;
        }
        const updatedUser = { ...editingUser, ...(res.data?.user || {}), password: '' };
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? updatedUser as User : u)));

        // اگر مدیر رمز جدیدی وارد کرده باشد، روی سرور تعیین می‌شود
        if (userForm.password.trim()) {
          const pwdRes = await adminResetUserPassword(editingUser.id, userForm.password.trim());
          if (!pwdRes.ok) {
            triggerAlert(pwdRes.error?.message || 'تعیین رمز جدید ناموفق بود.');
            return;
          }
          setOneTimeCredential({
            title: `رمز جدید ${updatedUser.first_name} ${updatedUser.last_name} (فقط یک‌بار نمایش داده می‌شود)`,
            password: pwdRes.data?.oneTimePassword || userForm.password.trim()
          });
        }
        triggerAlert(`اطلاعات کاربر «${updatedUser.first_name} ${updatedUser.last_name}» با موفقیت بروزرسانی شد.`);
      } else {
        const res = await adminCreateUser({
          first_name: userForm.first_name.trim(),
          last_name: userForm.last_name.trim(),
          national_code: userForm.national_code.trim(),
          phone: userForm.phone.trim(),
          password: userForm.password.trim() || undefined,
          role: userForm.role,
          gender: userForm.gender,
          education_level: userForm.education_level,
          grade: userForm.grade.trim(),
          province: userForm.province.trim(),
          city: userForm.city.trim(),
          birth_date: userForm.birth_date.trim(),
          school_name: userForm.school_name.trim(),
          personal_code: userForm.personal_code.trim(),
          postal_code: userForm.postal_code.trim(),
          address: userForm.address.trim(),
          points: Number(userForm.points) || 100,
          level: Number(userForm.level) || 1
        });
        if (!res.ok) {
          triggerAlert(res.error?.message || 'ایجاد کاربر ناموفق بود.');
          return;
        }
        const created: User = { ...(res.data?.user as User), password: '' };
        setUsers(prev => (prev.some(u => u.id === created.id) ? prev : [...prev, created]));
        setOneTimeCredential({
          title: `رمز عبور «${created.first_name} ${created.last_name}» (فقط یک‌بار نمایش داده می‌شود)`,
          password: res.data?.oneTimePassword || ''
        });
        triggerAlert(`کاربر جدید «${created.first_name} ${created.last_name}» با کد اختصاصی ${created.personal_code} ایجاد شد.`);
      }

      setShowUserModal(false);
      setEditingUser(null);
      return;
    }

    /* ==================== حالت محلی (بدون بک‌اند امن) ==================== */
    let updatedList: User[];
    const localEditedHash = userForm.password.trim() ? await sha256Hex(userForm.password.trim()) : '';
    const localEditedPlain = userForm.password.trim();
    if (editingUser) {
      updatedList = users.map(u => u.id === editingUser.id ? {
        ...u,
        first_name: userForm.first_name.trim(),
        last_name: userForm.last_name.trim(),
        national_code: userForm.national_code.trim(),
        phone: userForm.phone.trim(),
        password: localEditedHash || u.password || '',
        role: userForm.role,
        gender: userForm.gender,
        education_level: userForm.education_level,
        grade: userForm.grade.trim(),
        province: userForm.province.trim(),
        city: userForm.city.trim(),
        birth_date: userForm.birth_date.trim(),
        school_name: userForm.school_name.trim(),
        personal_code: userForm.personal_code.trim() || u.personal_code,
        postal_code: userForm.postal_code.trim(),
        address: userForm.address.trim(),
        points: Number(userForm.points) || 0,
        level: Number(userForm.level) || 1
      } : u);
      if (localEditedHash) {
        setOneTimeCredential({
          title: `رمز جدید ${userForm.first_name} ${userForm.last_name} (حالت محلی — فقط یک‌بار)`,
          password: localEditedPlain
        });
      }
      triggerAlert(`اطلاعات کاربر «${userForm.first_name} ${userForm.last_name}» با موفقیت بروزرسانی شد.`);
    } else {
      const localPlainPassword = userForm.password.trim() || generateSecurePasswordLocal();
      const newUserObj: User = {
        id: `usr_${Date.now()}`,
        first_name: userForm.first_name.trim(),
        last_name: userForm.last_name.trim(),
        national_code: userForm.national_code.trim(),
        phone: userForm.phone.trim(),
        password: await sha256Hex(localPlainPassword),
        role: userForm.role,
        gender: userForm.gender,
        education_level: userForm.education_level,
        grade: userForm.grade.trim() || 'هشتم',
        province: userForm.province.trim() || 'تهران',
        city: userForm.city.trim() || 'تهران',
        birth_date: userForm.birth_date.trim() || '1388/01/01',
        school_name: userForm.school_name.trim() || 'دبیرستان',
        personal_code: userForm.personal_code.trim() || Math.floor(100000000 + Math.random() * 900000000).toString(),
        postal_code: userForm.postal_code.trim(),
        address: userForm.address.trim(),
        points: Number(userForm.points) || 100,
        level: Number(userForm.level) || 1
      };
      updatedList = [...users, newUserObj];
      setOneTimeCredential({
        title: `رمز عبور «${newUserObj.first_name} ${newUserObj.last_name}» (حالت محلی — فقط یک‌بار)`,
        password: localPlainPassword
      });
      triggerAlert(`کاربر جدید «${userForm.first_name} ${userForm.last_name}» با کد اختصاصی ${newUserObj.personal_code} ایجاد گردید.`);
    }

    setUsers(updatedList);
    setShowUserModal(false);
  };

  const handleDeleteUser = (user: User) => {
    confirmInternal(`آیا از حذف کامل کاربر/رزمنده «${user.first_name} ${user.last_name}» با کد اختصاصی ${user.personal_code} اطمینان دارید؟`, {
      title: 'تأیید حذف کاربر',
      confirmText: 'حذف کاربر',
      onConfirm: () => {
        const ownedGroupIds = groups
          .filter(group => group.leader_id === user.id)
          .map(group => group.id);
        const updatedList = users
          .filter(u => u.id !== user.id)
          .map(u => ownedGroupIds.includes(u.group_id || '')
            ? { ...u, group_id: undefined, is_group_member: false }
            : u);
        setUsers(updatedList);
        if (ownedGroupIds.length > 0) {
          setGroups(prev => prev.filter(group => !ownedGroupIds.includes(group.id)));
        }
        triggerAlert(`کاربر «${user.first_name} ${user.last_name}» با موفقیت حذف گردید.`);
      }
    });
  };

  // MISSION CRUD & EDIT STATES
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [missionForm, setMissionForm] = useState({
    title: '',
    description: '',
    banner_path: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    video_url: '',
    max_score: 100,
    is_optional: false,
    is_active: true
  });

  // TRAINING CRUD & EDIT STATES
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [trainingForm, setTrainingForm] = useState<{
    title: string;
    description: string;
    video_url: string;
    media_path: string;
    media_type: 'video' | 'audio' | 'image' | 'document' | 'iframe';
    target_role: TargetRole;
    category: string;
    is_active: boolean;
  }>({
    title: '',
    description: '',
    video_url: '',
    media_path: '',
    media_type: 'video',
    target_role: 'all',
    category: 'پدافند و امنیت',
    is_active: true
  });

  // LOCAL NOTIFICATION FORM STATES
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<NotificationType>('urgent');
  const [notifTarget, setNotifTarget] = useState<NotificationTarget>('all');
  const [notifTargetUserId, setNotifTargetUserId] = useState('');
  const [notifTargetGroupId, setNotifTargetGroupId] = useState('');
  const [notifActionTab, setNotifActionTab] = useState<string>('Missions');
  const [notifActionLabel, setNotifActionLabel] = useState<string>('مشاهده مأموریت');
  const [notifSenderName, setNotifSenderName] = useState<string>('ستاد کل فرماندهی اتاق جنگ');
  const [previewTestSent, setPreviewTestSent] = useState(false);

  // LOCAL CMS FORM STATES
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const isDraggingTabs = React.useRef(false);
  const startX = React.useRef(0);
  const scrollLeftStart = React.useRef(0);

  const handleTabsMouseDown = (e: React.MouseEvent) => {
    if (!tabsContainerRef.current) return;
    isDraggingTabs.current = true;
    startX.current = e.pageX - tabsContainerRef.current.offsetLeft;
    scrollLeftStart.current = tabsContainerRef.current.scrollLeft;
  };

  const handleTabsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabs.current || !tabsContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    tabsContainerRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const handleTabsMouseUpOrLeave = () => {
    isDraggingTabs.current = false;
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 260;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Scroll to top when admin sub-tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeAdminTab]);
  const [cmsSiteName, setCmsSiteName] = useState(siteSettings?.siteName || 'اتاق جنگ');
  const [cmsSiteTagline, setCmsSiteTagline] = useState(siteSettings?.siteTagline || 'سامانه جامع مسابقات، مأموریت‌ها و ارزیابی هوشمند');
  const [cmsBadgeText, setCmsBadgeText] = useState(siteSettings?.badgeText || 'پرونده ماجراجویی هفت‌خوان');
  const [generalTitle, setGeneralTitle] = useState(siteSettings?.heroTitle || 'مأموریت اصلی: مسابقه بزرگ اتاق جنگ');
  const [generalProgress, setGeneralProgress] = useState(siteSettings?.heroProgress || '۷۲٪');
  const [generalCountdown, setGeneralCountdown] = useState(siteSettings?.heroCountdown || '۰۲:۱۴:۳۹:۱۵');
  const [generalImage, setGeneralImage] = useState(siteSettings?.heroImage || '');
  const [heroVideoUrl, setHeroVideoUrl] = useState(siteSettings?.heroVideoUrl || '');
  const [teaserVideoUrl, setTeaserVideoUrl] = useState(siteSettings?.teaserVideoUrl || '');
  const [girlsBannerImage, setGirlsBannerImage] = useState(siteSettings?.girlsBannerImage || '');
  const [boysBannerImage, setBoysBannerImage] = useState(siteSettings?.boysBannerImage || '');
  const [generalBtnText, setGeneralBtnText] = useState(siteSettings?.heroButtonText || 'ورود و ثبت‌نام');
  const [generalPhone, setGeneralPhone] = useState(siteSettings?.contactPhone || '۰۲۱-۸۸۹۹۷۷۶۶');
  const [generalEmail, setGeneralEmail] = useState(siteSettings?.contactEmail || 'info@warroom.ir');
  const [generalTelegram, setGeneralTelegram] = useState(siteSettings?.telegram || 'WarRoom_Support');
  const [baleLink, setBaleLink] = useState(siteSettings?.baleLink || 'https://bale.ai/warroom');
  const [eitaaLink, setEitaaLink] = useState(siteSettings?.eitaaLink || 'https://eitaa.com/warroom');
  const [generalAddress, setGeneralAddress] = useState(siteSettings?.address || '');
  const [generalAboutText, setGeneralAboutText] = useState(siteSettings?.aboutText || '');
  const [prizeTitle, setPrizeTitle] = useState(siteSettings?.prizeTitle || 'جایزه‌ها و هدایای مسابقه بزرگ');
  const [prizeDescription, setPrizeDescription] = useState(siteSettings?.prizeDescription || 'کریستال جمع کن و جایزه‌های نفیس برنده شو!');
  const [homeButtons, setHomeButtons] = useState<HomeButtonConfig[]>(siteSettings?.homeButtons || defaultHomeButtons);
  const [isElementorOpen, setIsElementorOpen] = useState(false);

  // Training Form Video Upload States
  const [trainingVideoMode, setTrainingVideoMode] = useState<'url' | 'upload'>('url');
  const [trainingUploadedFileName, setTrainingUploadedFileName] = useState<string>('');
  const [trainingUploadedFileSize, setTrainingUploadedFileSize] = useState<string>('');

  // Local FAQ form state
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');

  // Local Stats form state
  const [statMissions, setStatMissions] = useState(homeStats?.activeMissions || 0);
  const [statParticipants, setStatParticipants] = useState(homeStats?.activeParticipants || 0);
  const [statGroups, setStatGroups] = useState(homeStats?.activeGroups || 0);

  // Local Home Announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [annImg, setAnnImg] = useState('');

  // SUBMISSIONS GRADING STATE
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeStatus, setGradeStatus] = useState<SubmissionStatus>('approved');
  const [gradeScore, setGradeScore] = useState<number>(100);
  const [adminNote, setAdminNote] = useState<string>('');

  // USER SEARCH & FILTER STATE
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userProvinceFilter, setUserProvinceFilter] = useState('all');
  const [userGenderFilter, setUserGenderFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // MANUAL MEDAL AWARDING STATE
  const [awardPersonalCode, setAwardPersonalCode] = useState('');
  const [awardMedalId, setAwardMedalId] = useState(medals[0]?.id || '');
  const [awardNote, setAwardNote] = useState('');

  // TICKET SUPPORT FILTER & REPLY STATE
  const [ticketSpecFilter, setTicketSpecFilter] = useState<'all' | TicketType>('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | TicketStatus>('all');
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyMarkStatus, setAdminReplyMarkStatus] = useState<'answered' | 'in_progress'>('answered');

  // NEW MEDAL MODAL FORM
  const [showNewMedalModal, setShowNewMedalModal] = useState(false);
  const [newMedal, setNewMedal] = useState({
    name: '',
    description: '',
    image: '🏅',
    category: 'عملیاتی'
  });

  // Global active modal tracking for AdminPanel (hides mobile bottom nav & music bar when any modal opens)
  const isAnyAdminModalActive = Boolean(
    showPortalModal || 
    showUserModal || 
    viewingUserDetail || 
    showMissionModal || 
    showTrainingModal || 
    showStageModal || 
    showPrizeModal || 
    showVitrinModal || 
    showSqlScriptModal || 
    showNewMedalModal || 
    Boolean(gradingSubId)
  );

  useEffect(() => {
    if (isAnyAdminModalActive) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [isAnyAdminModalActive]);

  const [publishToVitrinInForm, setPublishToVitrinInForm] = useState(false);

  // TOGGLE VITRIN PUBLICATION FOR SUBMISSIONS
  const handleToggleVitrinPublication = (sub: MissionSubmission) => {
    const isCurrentlyInVitrin = sub.is_in_vitrin;
    if (isCurrentlyInVitrin) {
      setVitrinPosts(prev => prev.filter(p => p.id !== `sub_${sub.id}` && p.id !== sub.id));
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, is_in_vitrin: false } : s));
      triggerAlert(`اثر «${sub.user_name}» از ویترین عمومی برداشته شد.`);
    } else {
      const newPost = buildVitrinPostFromSubmission({
        id: sub.id,
        user_name: sub.user_name,
        personal_code: sub.personal_code,
        mission_title: sub.mission_title,
        file_path: sub.file_path,
        file_name: sub.file_name,
        file_type: sub.file_type,
        user_note: sub.user_note,
        awarded_score: sub.awarded_score || 100
      });
      setVitrinPosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, is_in_vitrin: true, status: 'approved' } : s));
      triggerAlert(`اثر «${sub.user_name}» با موفقیت تأیید و در ویترین عمومی منتشر شد!`);
    }
  };

  // SUBMIT GRADING HANDLER
  const handleGradeSubmit = (sub: MissionSubmission) => {
    const mission = missions.find(m => m.id === sub.mission_id);
    const maxScore = mission?.max_score || 100;
    const finalScore = gradeStatus === 'approved' ? Math.min(gradeScore, maxScore) : 0;
    const shouldPublishToVitrin = gradeStatus === 'approved' && publishToVitrinInForm;

    if (shouldPublishToVitrin) {
      const newPost = buildVitrinPostFromSubmission({
        id: sub.id,
        user_name: sub.user_name,
        personal_code: sub.personal_code,
        mission_title: sub.mission_title,
        file_path: sub.file_path,
        file_name: sub.file_name,
        file_type: sub.file_type,
        user_note: sub.user_note,
        awarded_score: finalScore
      });
      setVitrinPosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);
    } else if (gradeStatus === 'rejected') {
      setVitrinPosts(prev => prev.filter(p => p.id !== `sub_${sub.id}` && p.id !== sub.id));
    }

    setSubmissions(prev => prev.map(s => 
      s.id === sub.id ? {
        ...s,
        status: gradeStatus,
        awarded_score: finalScore,
        admin_note: adminNote,
        is_in_vitrin: shouldPublishToVitrin ? true : (gradeStatus === 'rejected' ? false : s.is_in_vitrin)
      } : s
    ));

    setGradingSubId(null);
    setPublishToVitrinInForm(false);
    triggerAlert(`ارسال رزمنده ${sub.user_name} ارزیابی شد. وضعیت: ${gradeStatus === 'approved' ? 'تأیید' : 'رد'} | امتیاز: ${finalScore}${shouldPublishToVitrin ? ' (منتشر در ویترین)' : ''}`);
  };

  // MANUAL MEDAL AWARD SUBMIT
  const handleAwardMedalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardPersonalCode.trim() || !awardMedalId) return;

    const targetUser = users.find(u => u.personal_code === awardPersonalCode.trim());
    if (!targetUser) {
      triggerAlert('رزمنده‌ای با این کد اختصاصی ۹ رقمی یافت نشد.');
      return;
    }

    // Check duplicate awarding
    const exists = userMedals.some(um => um.personal_code === targetUser.personal_code && um.medal_id === awardMedalId);
    if (exists) {
      triggerAlert('این نشان قبلاً به این رزمنده اهدا گردیده است.');
      return;
    }

    const selectedMedalObj = medals.find(m => m.id === awardMedalId);

    const newUserMedal: UserMedal = {
      id: `um-${Date.now()}`,
      personal_code: targetUser.personal_code,
      medal_id: awardMedalId,
      medal_name: selectedMedalObj?.name || 'مدال شجاعت',
      note: awardNote,
      awarded_at: '۱۴۰۳/۰۲/۲۲'
    };

    setUserMedals(prev => [...prev, newUserMedal]);
    setAwardPersonalCode('');
    setAwardNote('');
    triggerAlert(`نشان "${selectedMedalObj?.name}" با موفقیت به رزمنده ${targetUser.first_name} ${targetUser.last_name} اهدا شد.`);
  };

  // ADMIN REPLY TO SUPPORT TICKET
  const handleAdminSendReply = (ticket: SupportTicket, overrideStatus?: 'answered' | 'in_progress') => {
    if (!adminReplyText.trim()) return;

    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = '۱۴۰۳/۰۴/۱۸ - ' + timeStr;

    const newReply: SupportReply = {
      id: `rep-${Date.now()}`,
      ticket_id: ticket.id,
      user_id: currentUser.id,
      user_name: 'پشتیبانی ستاد اتاق جنگ',
      message: adminReplyText.trim(),
      is_admin: true,
      created_at: dateStr
    };

    setReplies(prev => [...prev, newReply]);

    const targetStatus = overrideStatus || adminReplyMarkStatus;

    // Update ticket status and timestamp
    setTickets(prev => prev.map(t => 
      t.id === ticket.id ? { 
        ...t, 
        status: targetStatus, 
        admin_id: currentUser.id,
        updated_at: dateStr 
      } : t
    ));

    setAdminReplyText('');
    setReplyTicketId(null);
    triggerAlert(`پاسخ ستاد ثبت شد و وضعیت تیکت به "${targetStatus === 'answered' ? 'پاسخ داده شده' : 'در حال بررسی'}" تغییر یافت.`);
  };

  // ADMIN DIRECT STATUS CHANGE
  const handleAdminChangeTicketStatus = (ticketId: string, newStatus: TicketStatus) => {
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = '۱۴۰۳/۰۴/۱۸ - ' + timeStr;

    setTickets(prev => prev.map(t => 
      t.id === ticketId ? { 
        ...t, 
        status: newStatus,
        admin_id: currentUser.id,
        updated_at: dateStr 
      } : t
    ));

    const statusLabels: Record<TicketStatus, string> = {
      open: 'در انتظار بررسی',
      in_progress: 'در حال بررسی',
      answered: 'پاسخ داده شده',
      closed: 'بسته شده / حل شده'
    };

    triggerAlert(`وضعیت تیکت به "${statusLabels[newStatus]}" تغییر یافت.`);
  };

  // ADMIN DELETE TICKET
  const handleAdminDeleteTicket = (ticketId: string) => {
    confirmInternal('آیا از حذف این تیکت اطمینان دارید؟', {
      title: 'تأیید حذف تیکت',
      confirmText: 'حذف تیکت',
      onConfirm: () => {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        setReplies(prev => prev.filter(r => r.ticket_id !== ticketId));
        triggerAlert('تیکت با موفقیت حذف گردید.');
      }
    });
  };

  // MISSION CRUD HANDLERS
  const handleOpenAddMission = () => {
    setEditingMission(null);
    setMissionForm({
      title: '',
      description: '',
      banner_path: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      video_url: '',
      max_score: 100,
      is_optional: false,
      is_active: true
    });
    setShowMissionModal(true);
  };

  const handleOpenEditMission = (m: Mission) => {
    setEditingMission(m);
    setMissionForm({
      title: m.title || '',
      description: m.description || '',
      banner_path: m.banner_path || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      video_url: m.video_url || '',
      max_score: m.max_score || 100,
      is_optional: Boolean(m.is_optional),
      is_active: m.is_active !== undefined ? m.is_active : true
    });
    setShowMissionModal(true);
  };

  const handleSaveMissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionForm.title.trim() || !missionForm.description.trim()) {
      triggerAlert('خطا: عنوان و شرح مأموریت نمی‌تواند خالی باشد.');
      return;
    }

    if (editingMission) {
      setMissions(prev => prev.map(m => m.id === editingMission.id ? {
        ...m,
        title: missionForm.title.trim(),
        description: missionForm.description.trim(),
        banner_path: missionForm.banner_path.trim() || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        video_url: missionForm.video_url.trim() || undefined,
        media_type: missionForm.video_url.trim() ? 'video' : 'image',
        max_score: Number(missionForm.max_score) || 100,
        is_optional: missionForm.is_optional,
        is_active: missionForm.is_active
      } : m));
      triggerAlert(`مأموریت «${missionForm.title}» با موفقیت بروزرسانی شد.`);
    } else {
      const missionObj: Mission = {
        id: `m-${Date.now()}`,
        title: missionForm.title.trim(),
        description: missionForm.description.trim(),
        banner_path: missionForm.banner_path.trim() || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        video_url: missionForm.video_url.trim() || undefined,
        media_type: missionForm.video_url.trim() ? 'video' : 'image',
        max_score: Number(missionForm.max_score) || 100,
        is_active: missionForm.is_active,
        is_optional: missionForm.is_optional,
        created_at: '۱۴۰۳/۰۲/۲۲'
      };
      setMissions(prev => [missionObj, ...prev]);
      triggerAlert(`مأموریت جدید «${missionObj.title}» ایجاد شد.`);
    }

    setShowMissionModal(false);
  };

  const handleDeleteMission = (m: Mission) => {
    confirmInternal(`آیا از حذف مأموریت «${m.title}» اطمینان دارید؟`, {
      title: 'تأیید حذف مأموریت',
      confirmText: 'حذف مأموریت',
      onConfirm: () => {
        setMissions(prev => prev.filter(x => x.id !== m.id));
        triggerAlert(`مأموریت «${m.title}» با موفقیت حذف گردید.`);
      }
    });
  };

  const handleToggleMissionActive = (m: Mission) => {
    setMissions(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x));
    triggerAlert(`وضعیت مأموریت «${m.title}» به ${!m.is_active ? 'فعال' : 'غیرفعال'} تغییر یافت.`);
  };

  // TRAINING CRUD HANDLERS
  const handleOpenAddTraining = () => {
    setEditingTraining(null);
    setTrainingForm({
      title: '',
      description: '',
      video_url: '',
      media_path: '',
      media_type: 'video',
      target_role: 'all',
      category: 'پدافند و امنیت',
      is_active: true
    });
    setShowTrainingModal(true);
  };

  const handleOpenEditTraining = (t: Training) => {
    setEditingTraining(t);
    setTrainingForm({
      title: t.title || '',
      description: t.description || '',
      video_url: t.video_url || '',
      media_path: t.media_path || '',
      media_type: t.media_type || 'video',
      target_role: t.target_role || 'all',
      category: t.category || 'پدافند و امنیت',
      is_active: t.is_active !== undefined ? t.is_active : true
    });
    setShowTrainingModal(true);
  };

  const handleSaveTrainingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingForm.title.trim() || !trainingForm.description.trim()) {
      triggerAlert('خطا: عنوان و شرح دوره آموزشی نمی‌تواند خالی باشد.');
      return;
    }

    if (editingTraining) {
      setTrainings(prev => prev.map(t => t.id === editingTraining.id ? {
        ...t,
        title: trainingForm.title.trim(),
        description: trainingForm.description.trim(),
        video_url: trainingForm.video_url.trim() || undefined,
        media_path: trainingForm.media_path.trim() || undefined,
        media_type: trainingForm.media_type,
        target_role: trainingForm.target_role,
        category: trainingForm.category.trim() || 'پدافند و امنیت',
        is_active: trainingForm.is_active
      } : t));
      triggerAlert(`دوره آموزشی «${trainingForm.title}» با موفقیت بروزرسانی شد.`);
    } else {
      const newTrainingObj: Training = {
        id: `tr-${Date.now()}`,
        title: trainingForm.title.trim(),
        description: trainingForm.description.trim(),
        video_url: trainingForm.video_url.trim() || undefined,
        media_path: trainingForm.media_path.trim() || undefined,
        media_type: trainingForm.media_type,
        target_role: trainingForm.target_role,
        is_active: trainingForm.is_active,
        category: trainingForm.category.trim() || 'پدافند و امنیت',
        created_at: '۱۴۰۳/۰۲/۲۵'
      };
      setTrainings(prev => [newTrainingObj, ...prev]);
      triggerAlert(`دوره آموزشی جدید «${newTrainingObj.title}» ایجاد شد.`);
    }

    setShowTrainingModal(false);
  };

  const handleDeleteTraining = (t: Training) => {
    confirmInternal(`آیا از حذف دوره آموزشی «${t.title}» اطمینان دارید؟`, {
      title: 'تأیید حذف دوره آموزشی',
      confirmText: 'حذف دوره',
      onConfirm: () => {
        setTrainings(prev => prev.filter(x => x.id !== t.id));
        triggerAlert(`دوره آموزشی «${t.title}» با موفقیت حذف گردید.`);
      }
    });
  };

  const handleToggleTrainingActive = (t: Training) => {
    setTrainings(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
    triggerAlert(`وضعیت دوره «${t.title}» به ${!t.is_active ? 'فعال' : 'غیرفعال'} تغییر یافت.`);
  };

  // CREATE NEW MEDAL
  const handleCreateMedal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedal.name) return;

    const medalObj: Medal = {
      id: `med-${Date.now()}`,
      name: newMedal.name,
      description: newMedal.description,
      image: newMedal.image,
      category: newMedal.category,
      is_active: true
    };

    setMedals(prev => [...prev, medalObj]);
    setShowNewMedalModal(false);
    setNewMedal({ name: '', description: '', image: '🏅', category: 'عملیاتی' });
    triggerAlert(`نشان جدید "${medalObj.name}" ایجاد شد.`);
  };

  // BROADCAST NOTIFICATION HANDLER
  const handleBroadcastNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      triggerAlert('لطفاً عنوان و متن پیام نوتیفیکیشن را وارد نمایید.');
      return;
    }

    let targetPersonalCode = '';
    if (notifTarget === 'specific_user' && notifTargetUserId) {
      const u = users.find(x => x.id === notifTargetUserId || x.personal_code === notifTargetUserId);
      if (u) {
        targetPersonalCode = u.personal_code;
      }
    }

    const newNotification: AppNotification = {
      id: `notif-${Date.now()}`,
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      type: notifType,
      target: notifTarget,
      target_user_id: notifTarget === 'specific_user' ? (notifTargetUserId || undefined) : undefined,
      target_personal_code: targetPersonalCode || undefined,
      target_group_id: notifTarget === 'specific_squad' ? notifTargetGroupId : undefined,
      action_tab: notifActionTab || undefined,
      action_label: notifActionLabel.trim() || undefined,
      sender_name: notifSenderName.trim() || 'ستاد کل فرماندهی اتاق جنگ',
      is_read_by: [],
      created_at: 'هم‌اکنون',
      timestamp: Date.now()
    };

    // Update notifications list
    setNotifications(prev => [newNotification, ...prev]);

    // Play synthesized sound
    playNotificationSound(notifType);

    // Call real-time broadcast callback
    if (onBroadcastNotification) {
      onBroadcastNotification(newNotification);
    }

    // Trigger cross-tab sync
    try {
      localStorage.setItem('warroom_last_live_notification', JSON.stringify({
        notif: newNotification,
        time: Date.now()
      }));
      window.dispatchEvent(new CustomEvent('warroom_live_broadcast', { detail: newNotification }));
    } catch (err) {}

    // Reset fields
    setNotifTitle('');
    setNotifMessage('');
    setPreviewTestSent(true);
    setTimeout(() => setPreviewTestSent(false), 4000);

    triggerAlert('🚀 نوتیفیکیشن زنده با موفقیت ارسال شد و در صفحه تمام کاربران واجد شرایط به نمایش درآمد.');
  };

  const applyPreset = (title: string, message: string, type: NotificationType, tab: string, label: string, target: NotificationTarget = 'all') => {
    setNotifTitle(title);
    setNotifMessage(message);
    setNotifType(type);
    setNotifActionTab(tab);
    setNotifActionLabel(label);
    setNotifTarget(target);
    triggerAlert('قالب پیش‌فرض پیام بارگذاری گردید.');
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const searchFields = [u.first_name, u.last_name, u.personal_code, u.national_code]
      .map(value => String(value || ''));
    const matchesTerm = !userSearchTerm || searchFields.some(value => value.includes(userSearchTerm));

    const matchesProvince = userProvinceFilter === 'all' || u.province === userProvinceFilter;
    const matchesGender = userGenderFilter === 'all' || u.gender === userGenderFilter;
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;

    return matchesTerm && matchesProvince && matchesGender && matchesRole;
  });

  // Filtered Tickets by specialization, status and search query
  const filteredTickets = tickets.filter(t => {
    const matchesSpec = ticketSpecFilter === 'all' || t.type === ticketSpecFilter;
    const matchesStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
    const matchesSearch = !ticketSearchTerm.trim() || 
      t.user_name.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
      t.personal_code.includes(ticketSearchTerm.trim()) ||
      t.subject.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
      t.message.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(ticketSearchTerm.toLowerCase());
    return matchesSpec && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 dir-rtl pb-8">

      {/* 🔐 نمایش یک‌باره رمز عبور تولیدشده (هرگز ذخیره/بازیابی نمی‌شود) */}
      {oneTimeCredential && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-[#0b1226] border border-amber-500/60 rounded-3xl p-5 space-y-3 text-white shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black">رمز عبور جدید</h3>
                <p className="text-[10px] text-slate-400">{oneTimeCredential.title}</p>
              </div>
            </div>

            <code
              className="block text-center py-3 rounded-xl bg-black/60 border border-amber-500/40 text-amber-200 font-mono text-base tracking-widest"
              dir="ltr"
            >
              {oneTimeCredential.password}
            </code>

            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-[10px] text-amber-100 leading-relaxed flex items-start gap-2">
              <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />
              <span>
                این رمز فقط همین یک‌بار نمایش داده می‌شود و در دیتابیس به‌صورت هش‌شده ذخیره شده است.
                آن را یادداشت/کپی کنید و تلفنی به کاربر اعلام نمایید.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(oneTimeCredential.password);
                    triggerAlert('رمز عبور کپی شد.');
                  } catch {
                    triggerAlert('کپی خودکار ناموفق بود؛ رمز را دستی یادداشت کنید.');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy size={13} />
                <span>کپی رمز عبور</span>
              </button>
              <button
                onClick={() => setOneTimeCredential(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-[#0d1021] to-[#120712] border border-amber-800/60 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <SlidersHorizontal size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">مرکز فرماندهی و ارزیابی ادمین (اتاق جنگ)</h2>
            <p className="text-xs text-slate-400 mt-0.5">مدیریت رزمندگان، داوری مأموریت‌ها، اهدای مدال‌ها، تیکت‌های پشتیبانی و محتوا</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-amber-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-amber-900/60">
            <span>داور فعال: {currentUser.first_name} {currentUser.last_name}</span>
          </div>
        </div>
      </div>

      {/* Admin Nav Tabs with Scroll Controls */}
      <div className="relative flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => scrollTabs('right')}
          className="hidden sm:flex items-center justify-center w-8 h-9 rounded-xl bg-slate-900/90 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition shrink-0 z-10 shadow-md cursor-pointer"
          title="پیمایش به راست"
        >
          <ChevronRight size={18} />
        </button>

        <div 
          ref={tabsContainerRef}
          onMouseDown={handleTabsMouseDown}
          onMouseMove={handleTabsMouseMove}
          onMouseUp={handleTabsMouseUpOrLeave}
          onMouseLeave={handleTabsMouseUpOrLeave}
          className="w-full overflow-x-auto no-scrollbar flex items-center gap-1.5 text-xs font-bold scroll-smooth cursor-grab active:cursor-grabbing select-none"
        >
        
        <button
          onClick={() => setActiveAdminTab('overview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'overview' 
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 border-amber-400 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
              : 'bg-[#080d21] text-amber-300 border-amber-500/40 hover:text-white'
          }`}
          id="btn-tab-overview"
        >
          <LayoutDashboard size={15} />
          <span>داشبورد عملیات ستاد</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('submissions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'submissions' 
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
              : 'bg-[#080d21] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Target size={15} />
          <span>داوری و امتیازدهی ({submissions.filter(s => s.status === 'pending').length} در انتظار)</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'users' 
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
              : 'bg-[#080d21] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Users size={15} />
          <span>مدیریت کاربران ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('password_resets')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'password_resets'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
              : 'bg-[#080d21] text-slate-300 border-slate-700 hover:text-white'
          }`}
          id="btn-tab-password-resets"
        >
          <KeyRound size={15} />
          <span>
            درخواست تغییر رمز مشتریان
            {passwordResetRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="mr-1.5 px-1.5 rounded-md bg-rose-600 text-white text-[10px] font-mono">
                {passwordResetRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminTab('stage_builder')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border relative ${
            activeAdminTab === 'stage_builder' 
              ? 'bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-500 text-slate-950 border-amber-400 font-black shadow-[0_0_20px_rgba(6,182,212,0.5)]' 
              : 'bg-[#080d21] text-cyan-300 border-cyan-500/40 hover:border-cyan-400 hover:text-white'
          }`}
          id="btn-tab-stage-builder"
        >
          <MapPin size={15} className="text-cyan-400" />
          <span>ایجاد مسیر و مراحل ({stages.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('missions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'missions' 
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
              : 'bg-[#080d21] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Target size={15} />
          <span>تعریف مأموریت‌ها ({missions.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('prizes')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border relative ${
            activeAdminTab === 'prizes' 
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 border-amber-400 font-black shadow-[0_0_20px_rgba(245,158,11,0.5)]' 
              : 'bg-[#080d21] text-amber-300 border-amber-500/40 hover:border-amber-400 hover:text-white'
          }`}
          id="btn-tab-prizes"
        >
          <Gift size={15} className="text-amber-400" />
          <span>ویترین جایزه‌ها ({prizes.filter(p => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'].includes(p.id)).length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('medals')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'medals' 
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
              : 'bg-[#080d21] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Award size={15} />
          <span>مدیریت مدال‌ها و اهدا ({medals.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('tickets')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'tickets' 
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
              : 'bg-[#080d21] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <HelpCircle size={15} />
          <span>پشتیبانی و تیکت‌ها ({tickets.filter(t => t.status === 'open').length} باز)</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('payments')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'payments'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
              : 'bg-[#080d21] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <CreditCard size={15} />
          <span>پرداختی‌ها</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('site_editor')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'site_editor' 
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
              : 'bg-[#080d21] text-slate-400 border-slate-800 hover:text-white'
          }`}
          id="btn-tab-site-editor"
        >
          <FileText size={15} />
          <span>مدیریت محتوای سایت و صفحات</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('chat_control')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'chat_control'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
              : 'bg-[#080d21] text-slate-400 border-slate-800 hover:text-white'
          }`}
          id="btn-tab-chat-control"
        >
          <MessageSquare size={15} />
          <span>کنترل چت روم</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('soundtracks')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border ${
            activeAdminTab === 'soundtracks' 
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-cyan-400 text-slate-950 border-amber-400 font-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
              : 'bg-[#080d21] text-cyan-300 border-cyan-500/40 hover:border-cyan-400 hover:text-white'
          }`}
          id="btn-tab-soundtracks"
        >
          <Radio size={15} className="text-cyan-400" />
          <span>مدیریت موسیقی و رادیو اتاق جنگ</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('notifications')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border relative ${
            activeAdminTab === 'notifications' 
              ? 'bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 text-slate-950 border-amber-400 font-black shadow-[0_0_20px_rgba(245,158,11,0.5)]' 
              : 'bg-[#080d21] text-amber-300 border-amber-500/40 hover:border-amber-400 hover:text-white'
          }`}
          id="btn-tab-notifications"
        >
          <Bell size={15} className="animate-bounce text-red-400" />
          <span>ارسال نوتیفیکیشن و پیام زنده</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        </button>

        <button
          onClick={() => setActiveAdminTab('portals')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border relative ${
            activeAdminTab === 'portals' 
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 border-emerald-400 font-black shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
              : 'bg-[#080d21] text-emerald-300 border-emerald-500/40 hover:border-emerald-400 hover:text-white'
          }`}
          id="btn-tab-portals"
        >
          <Gamepad2 size={15} className="text-emerald-400" />
          <span>مدیریت درگاه‌ها و لینک‌دهی ({portals.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('vitrins')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition border relative ${
            activeAdminTab === 'vitrins'
              ? 'bg-gradient-to-r from-fuchsia-500 via-rose-400 to-amber-400 text-slate-950 border-rose-400 font-black shadow-[0_0_20px_rgba(244,63,94,0.5)]'
              : 'bg-[#080d21] text-rose-300 border-rose-500/40 hover:border-rose-400 hover:text-white'
          }`}
          id="btn-tab-vitrins"
        >
          <Gem size={15} className="text-rose-400" />
          <span>ویترین آثار ({vitrinPosts.length})</span>
        </button>

      </div>

      <button
        onClick={() => scrollTabs('left')}
        className="hidden sm:flex items-center justify-center w-8 h-9 rounded-xl bg-slate-900/90 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition shrink-0 z-10 shadow-md cursor-pointer"
        title="پیمایش به چپ"
      >
        <ChevronLeft size={18} />
      </button>
    </div>

      {/* 0. OPERATIONS DASHBOARD & MONITORING TAB */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-slate-950/90 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <LayoutDashboard className="text-amber-400" size={18} />
                داشبورد عملیات و مرکز فرماندهی ستاد
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                نظارت هوشمند لحظه‌ای بر وضعیت رزمندگان، جوخه‌ها، مأموریت‌ها و رتبه‌بندی
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono bg-amber-500/10 text-amber-300 px-3 py-1 rounded-xl border border-amber-500/30">
                {formatToPersianDigits(users.length)} رزمنده • {formatToPersianDigits(groups.length)} جوخه
              </span>
            </div>
          </div>

          <DashboardView
            currentUser={currentUser}
            users={users}
            groups={groups}
            missions={missions}
            submissions={submissions}
            announcements={announcements}
            news={news}
            medals={medals}
            userMedals={userMedals}
            tickets={tickets}
            setTickets={setTickets}
            replies={replies}
            setReplies={setReplies}
            triggerAlert={triggerAlert}
            onNavigate={(tab) => {
              if (tab === 'submissions' || tab === 'users' || tab === 'missions' || tab === 'medals' || tab === 'tickets' || tab === 'soundtracks' || tab === 'notifications') {
                setActiveAdminTab(tab as any);
              } else if (onNavigate) {
                onNavigate(tab);
              }
            }}
            onOpenSquadModal={() => setActiveAdminTab('users')}
          />
        </div>
      )}

      {/* 1. SUBMISSIONS REVIEW & GRADING TAB */}
      {activeAdminTab === 'submissions' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Target className="text-amber-400" size={18} />
            صف بازبینی و امتیازدهی به پاسخ‌های مأموریت
          </h3>

          <div className="space-y-3.5">
            {submissions.map(sub => {
              const mission = missions.find(m => m.id === sub.mission_id);
              const maxScore = mission?.max_score || 100;
              const isGradingThis = gradingSubId === sub.id;

              return (
                <div 
                  key={sub.id} 
                  className={`bg-[#070b1e] border p-3.5 sm:p-4 rounded-2xl space-y-3 transition shadow-md ${
                    sub.status === 'pending' ? 'border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-black text-xs sm:text-sm text-white tracking-wide">{sub.user_name}</span>
                      <span className="text-[11px] text-amber-400 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">کد: {formatToPersianDigits(sub.personal_code)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-slate-300 font-medium">مأموریت: <strong className="text-amber-200">{sub.mission_title}</strong></span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        sub.status === 'approved' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                        sub.status === 'rejected' ? 'bg-red-950 text-red-300 border-red-800' :
                        'bg-amber-950 text-amber-300 border-amber-800'
                      }`}>
                        {sub.status === 'approved' ? `تأیید شده (+${formatToPersianDigits(sub.awarded_score || 0)})` : sub.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>تاریخ ارسال: {sub.submitted_at}</span>
                    </div>
                  </div>

                  {/* Submission details */}
                  <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80 text-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
                      <span className="truncate max-w-[240px] sm:max-w-xs">فایل ارسالی: <strong className="text-rose-400 font-mono">{sub.file_name}</strong> <span className="text-slate-400">({sub.file_size})</span></span>
                      <button 
                        onClick={() => showInternalToast(`دانلود فایل ${sub.file_name} شبیه‌سازی شد.`, 'دانلود فایل')}
                        className="bg-slate-900 hover:bg-slate-800 text-cyan-300 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-cyan-500/30 flex items-center justify-center gap-1.5 transition shrink-0"
                      >
                        <Download size={13} />
                        <span>دانلود / مشاهده فایل</span>
                      </button>
                    </div>

                    {sub.user_note && (
                      <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                        <span className="text-slate-400 font-bold block mb-0.5">یادداشت رزمنده:</span>
                        <p className="leading-relaxed">«{sub.user_note}»</p>
                      </div>
                    )}
                  </div>

                  {/* Grading trigger / form */}
                  {!isGradingThis ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          setGradingSubId(sub.id);
                          setGradeStatus(sub.status === 'pending' ? 'approved' : sub.status);
                          setGradeScore(sub.awarded_score || maxScore);
                          setAdminNote(sub.admin_note || '');
                          setPublishToVitrinInForm(!!sub.is_in_vitrin);
                        }}
                        className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Edit3 size={14} />
                        <span>{sub.status === 'pending' ? 'ارزیابی و ثبت امتیاز' : 'ویرایش ارزیابی و بازخورد'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleVitrinPublication(sub)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          sub.is_in_vitrin 
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-300'
                            : 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/50 text-indigo-300'
                        }`}
                        title="انتشار یا عدم انتشار اثر در بخش ویترین و آثار سایت"
                      >
                        <Star size={14} className={sub.is_in_vitrin ? 'fill-emerald-400 text-emerald-400' : ''} />
                        <span>{sub.is_in_vitrin ? 'منتشر در ویترین (کلیک برای لغو)' : 'تأیید و انتشار در ویترین آثار'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/50 space-y-3">
                      <h4 className="text-xs font-black text-amber-400">فرم ثبت نمره و بازخورد هیئت داوران:</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">وضعیت ارزیابی:</label>
                          <select
                            value={gradeStatus}
                            onChange={(e) => setGradeStatus(e.target.value as SubmissionStatus)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                          >
                            <option value="approved">تأیید شده (تخصیص امتیاز)</option>
                            <option value="rejected">رد شده (نیازمند اصلاح)</option>
                            <option value="pending">در انتظار ماندن</option>
                          </select>
                        </div>

                        {gradeStatus === 'approved' && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">امتیاز اختصاصی (سقف {maxScore}):</label>
                            <input
                              type="number"
                              min={0}
                              max={maxScore}
                              value={gradeScore}
                              onChange={(e) => setGradeScore(parseInt(e.target.value, 10) || 0)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                            />
                          </div>
                        )}
                      </div>

                      {gradeStatus === 'approved' && (
                        <label className="flex items-center gap-2 p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 cursor-pointer text-xs text-amber-200">
                          <input 
                            type="checkbox"
                            checked={publishToVitrinInForm}
                            onChange={(e) => setPublishToVitrinInForm(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-400"
                          />
                          <span className="font-bold flex items-center gap-1.5">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            تأیید و انتشار همزمان در بخش «ویترین و آثار» برای عموم
                          </span>
                        </label>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">بازخورد و پیام داور به رزمنده:</label>
                        <textarea
                          rows={2}
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="نکات قوت، ایرادات فنی یا پیام تشویقی..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setGradingSubId(null)}
                          className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-xl transition"
                        >
                          انصراف
                        </button>
                        <button
                          onClick={() => handleGradeSubmit(sub)}
                          className="w-2/3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2 rounded-xl transition shadow-lg"
                        >
                          ثبت ارزیابی نهایی
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. USERS & SQUADS MANAGEMENT TAB */}
      {activeAdminTab === 'password_resets' && (
        <PasswordResetsAdmin
          currentUser={currentUser}
          users={users}
          setUsers={setUsers}
          localRequests={passwordResetRequests}
          setLocalRequests={setPasswordResetRequests}
          triggerAlert={triggerAlert}
        />
      )}

      {activeAdminTab === 'users' && (
        <div className="space-y-5 dir-rtl font-sans">
          {/* Header Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#080d21] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">مدیریت رزمندگان و کاربر سیستم ({filteredUsers.length} از {users.length})</h3>
                <p className="text-xs text-slate-400 mt-0.5">افزایش، ویرایش، حذف و مشاهده کامل شناسنامه رزمندگان و فرماندهان</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute right-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="جستجوی نام، کد اختصاصی، کد ملی..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl pr-9 pl-3 py-2 text-xs text-white"
                />
              </div>

              <select
                value={userGenderFilter}
                onChange={(e) => setUserGenderFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-300 px-3 py-2 rounded-2xl text-xs cursor-pointer"
              >
                <option value="all">همه جنسیت‌ها</option>
                <option value="پسر">پسر</option>
                <option value="دختر">دختر</option>
              </select>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-300 px-3 py-2 rounded-2xl text-xs cursor-pointer"
              >
                <option value="all">همه نقش‌ها</option>
                <option value="user">رزمنده انفرادی</option>
                <option value="leader">فرمانده جوخه</option>
                <option value="member">عضو جوخه</option>
                <option value="admin">ادمین کل</option>
              </select>

              <button
                onClick={handleOpenAddUser}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>افزودن کاربر جدید</span>
              </button>
            </div>
          </div>

          {/* Users List Grid / Table */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-2">
                <Users size={32} className="mx-auto text-slate-600 animate-bounce" />
                <p className="text-xs font-bold">هیچ کاربری با این مشخصات یافت نشد.</p>
              </div>
            ) : (
              filteredUsers.map(u => {
                const isUserAdmin = u.role === 'admin';
                const isLeader = u.role === 'leader';
                const isMember = u.role === 'member';
                const squadInfo = u.group_id ? groups.find(g => g.id === u.group_id) : null;

                return (
                  <div
                    key={u.id}
                    className="bg-[#080d21] border border-slate-800 hover:border-slate-700 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200"
                  >
                    {/* User Profile Overview */}
                    <div className="space-y-2.5">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-black text-white">{u.first_name} {u.last_name}</span>
                        
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          isUserAdmin
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                            : isLeader
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : isMember
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        }`}>
                          {isUserAdmin ? 'ادمین کل' : isLeader ? 'فرمانده' : isMember ? 'عضو جوخه' : 'رزمنده انفرادی'}
                        </span>

                        <span className="bg-slate-900 text-slate-300 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Hash size={11} className="text-amber-400" />
                          کد اختصاصی: <strong className="text-amber-300">{u.personal_code}</strong>
                        </span>

                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          u.gender === 'دختر'
                            ? 'bg-pink-950/60 text-pink-300 border-pink-800'
                            : 'bg-blue-950/60 text-blue-300 border-blue-800'
                        }`}>
                          {u.gender || 'پسر'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-400 font-sans">
                        <div className="flex items-center gap-1.5">
                          <Shield size={13} className="text-slate-500 shrink-0" />
                          <span>کد ملی: <strong className="text-slate-200 font-mono">{u.national_code}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-slate-500 shrink-0" />
                          <span>موبایل: <strong className="text-slate-200 font-mono">{u.phone}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building size={13} className="text-slate-500 shrink-0" />
                          <span>مدرسه: <strong className="text-slate-200">{u.school_name || 'نامشخص'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-500 shrink-0" />
                          <span>موقعیت: <strong className="text-slate-200">استان {u.province}، {u.city}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen size={13} className="text-slate-500 shrink-0" />
                          <span>مقطع/پایه: <strong className="text-slate-200">{u.education_level} ({u.grade})</strong></span>
                        </div>
                        {squadInfo && (
                          <div className="flex items-center gap-1.5">
                            <Users size={13} className="text-cyan-400 shrink-0" />
                            <span>جوخه: <strong className="text-cyan-300">{squadInfo.name}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                      <button
                        onClick={() => setViewingUserDetail(u)}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        title="مشاهده تمام اطلاعات رزمنده"
                      >
                        <Eye size={14} />
                        <span>مشاهده مشخصات</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 hover:text-white transition cursor-pointer"
                        title="ویرایش کاربر"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="حذف کاربر"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* VIEW USER FULL DETAIL MODAL */}
          {viewingUserDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
              <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setViewingUserDetail(null)}
              />

              <div className="relative w-full max-w-2xl bg-[#081026] border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl z-10 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg">
                      {viewingUserDetail.first_name?.[0] || 'ر'}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">
                        شناسنامه کامل: {viewingUserDetail.first_name} {viewingUserDetail.last_name}
                      </h3>
                      <p className="text-xs text-amber-300 font-mono">
                        کد اختصاصی رزمنده: {viewingUserDetail.personal_code}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingUserDetail(null)}
                    className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  
                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">نام و نام خانوادگی:</span>
                    <p className="text-white font-black text-sm">{viewingUserDetail.first_name} {viewingUserDetail.last_name}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">کد اختصاصی (ورود):</span>
                    <p className="text-amber-300 font-mono font-black text-sm">{viewingUserDetail.personal_code}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">کد ملی:</span>
                    <p className="text-cyan-300 font-mono font-bold">{viewingUserDetail.national_code || 'ثبت نشده'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">شماره تلفن همراه:</span>
                    <p className="text-emerald-300 font-mono font-bold">{viewingUserDetail.phone || 'ثبت نشده'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-bold block">رمز عبور:</span>
                    <p className="text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                      <ShieldCheck size={13} />
                      <span>{backendReady ? 'به‌صورت هش‌شده (scrypt) روی سرور نگه‌داری می‌شود' : 'هش‌شده در مرورگر'}</span>
                    </p>
                    <button
                      onClick={async () => {
                        const user = viewingUserDetail;
                        const liveStatus = await probeBackend();
                        if (!liveStatus.available) {
                          const temp = Array.from(crypto.getRandomValues(new Uint8Array(9)))
                            .map((n) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[n % 58])
                            .join('');
                          const hashed = await sha256Hex(temp);
                          setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, password: hashed } : u)));
                          setOneTimeCredential({ title: `رمز جدید ${user.first_name} ${user.last_name} (حالت محلی)`, password: temp });
                          triggerAlert(`رمز جدید برای «${user.first_name} ${user.last_name}» تولید شد. آن را به کاربر اعلام کنید.`);
                          return;
                        }
                        const res = await adminResetUserPassword(user.id);
                        if (!res.ok) {
                          triggerAlert(res.error?.message || 'بازنشانی رمز ناموفق بود.');
                          return;
                        }
                        setOneTimeCredential({
                          title: `رمز جدید ${user.first_name} ${user.last_name} (فقط یک‌بار نمایش داده می‌شود)`,
                          password: res.data?.oneTimePassword || ''
                        });
                        triggerAlert('رمز جدید تولید شد. آن را به کاربر اعلام کنید.');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound size={12} />
                      <span>تولید رمز جدید</span>
                    </button>
                    <p className="text-[9px] text-slate-500 leading-relaxed">
                      به دلایل امنیتی، متن رمز کاربران نمایش داده نمی‌شود؛ برای رمز جدید از دکمه بالا استفاده
                      یا درخواست تغییر رمز کاربر را از تب «درخواست تغییر رمز» بررسی کنید.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">نقش در سامانه:</span>
                    <p className="text-amber-200 font-bold">
                      {viewingUserDetail.role === 'admin' ? 'ادمین کل' : viewingUserDetail.role === 'leader' ? 'فرمانده جوخه' : viewingUserDetail.role === 'member' ? 'عضو جوخه' : 'رزمنده انفرادی'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">جنسیت:</span>
                    <p className="text-slate-200 font-bold">{viewingUserDetail.gender || 'پسر'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">تاریخ تولد:</span>
                    <p className="text-slate-200 font-mono">{viewingUserDetail.birth_date || 'نامشخص'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">مقطع و پایه تحصیلی:</span>
                    <p className="text-slate-200 font-bold">{viewingUserDetail.education_level} ({viewingUserDetail.grade})</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">نام مدرسه / دبیرستان:</span>
                    <p className="text-slate-200 font-bold">{viewingUserDetail.school_name || 'ثبت نشده'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">استان و شهر:</span>
                    <p className="text-slate-200 font-bold">استان {viewingUserDetail.province} - {viewingUserDetail.city}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">امتیازات و سطح فعلی:</span>
                    <p className="text-amber-400 font-bold">{viewingUserDetail.points || 0} امتیاز • سطح {viewingUserDetail.level || 1}</p>
                  </div>

                  {viewingUserDetail.postal_code && (
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-bold block">کد پستی:</span>
                      <p className="text-slate-200 font-mono">{viewingUserDetail.postal_code}</p>
                    </div>
                  )}

                  {viewingUserDetail.address && (
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1 sm:col-span-2">
                      <span className="text-[11px] text-slate-400 font-bold block">آدرس منزل / محل سکونت:</span>
                      <p className="text-slate-200 leading-relaxed">{viewingUserDetail.address}</p>
                    </div>
                  )}

                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      const u = viewingUserDetail;
                      setViewingUserDetail(null);
                      handleOpenEditUser(u);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={15} />
                    <span>ویرایش اطلاعات رزمنده</span>
                  </button>

                  <button
                    onClick={() => setViewingUserDetail(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 cursor-pointer"
                  >
                    بستن
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* CREATE / EDIT USER MODAL */}
          {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
              <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setShowUserModal(false)}
              />

              <div className="relative w-full max-w-2xl bg-[#081026] border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus size={20} className="text-amber-400" />
                    <h3 className="text-lg font-black text-white">
                      {editingUser ? `ویرایش کاربر «${editingUser.first_name} ${editingUser.last_name}»` : 'ثبت رزمنده / کاربر جدید'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveUserSubmit} className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        نام <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="مثلاً: محمد"
                        value={userForm.first_name}
                        onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        نام خانوادگی <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="مثلاً: رضایی"
                        value={userForm.last_name}
                        onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        کد اختصاصی ورود (۹ رقمی) <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="۹ رقم عددی"
                        value={userForm.personal_code}
                        onChange={(e) => setUserForm({ ...userForm, personal_code: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        کد ملی (۱۰ رقم)
                      </label>
                      <input
                        type="text"
                        placeholder="کد ملی"
                        value={userForm.national_code}
                        onChange={(e) => setUserForm({ ...userForm, national_code: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        شماره همراه (موبایل)
                      </label>
                      <input
                        type="text"
                        placeholder="09123456789"
                        value={userForm.phone}
                        onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 font-mono dir-ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        رمز عبور {editingUser ? '(خالی = بدون تغییر)' : '(خالی = تولید خودکار امن)'}
                      </label>
                      <input
                        type="text"
                        autoComplete="new-password"
                        placeholder="حداقل ۸ کاراکتر شامل حرف و رقم"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">
                        رمز به‌صورت هش‌شده ذخیره می‌شود و برای مدیر قابل مشاهده نیست.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">نقش سیستم</label>
                      <select
                        value={userForm.role}
                        onChange={(e: any) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="user">رزمنده انفرادی</option>
                        <option value="leader">فرمانده جوخه</option>
                        <option value="member">عضو جوخه</option>
                        <option value="admin">ادمین کل</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">جنسیت</label>
                      <select
                        value={userForm.gender}
                        onChange={(e: any) => setUserForm({ ...userForm, gender: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="پسر">پسر</option>
                        <option value="دختر">دختر</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">مقطع تحصیلی</label>
                      <select
                        value={userForm.education_level}
                        onChange={(e: any) => setUserForm({ ...userForm, education_level: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="ابتدایی">ابتدایی</option>
                        <option value="متوسطه اول">متوسطه اول</option>
                        <option value="متوسطه دوم">متوسطه دوم</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">پایه تحصیلی</label>
                      <input
                        type="text"
                        placeholder="مثلاً: هشتم"
                        value={userForm.grade}
                        onChange={(e) => setUserForm({ ...userForm, grade: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">تاریخ تولد</label>
                      <PersianDatePicker
                        value={userForm.birth_date}
                        onChange={(val) => setUserForm({ ...userForm, birth_date: val })}
                        isGirls={userForm.gender === 'دختر'}
                        placeholder="انتخاب تاریخ تولد"
                        className="bg-slate-950 border-slate-800 hover:border-amber-500 focus:border-amber-500 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">استان</label>
                      <input
                        type="text"
                        placeholder="استان"
                        value={userForm.province}
                        onChange={(e) => setUserForm({ ...userForm, province: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">شهر</label>
                      <input
                        type="text"
                        placeholder="شهر"
                        value={userForm.city}
                        onChange={(e) => setUserForm({ ...userForm, city: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">نام مدرسه</label>
                      <input
                        type="text"
                        placeholder="نام مدرسه"
                        value={userForm.school_name}
                        onChange={(e) => setUserForm({ ...userForm, school_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">کد پستی</label>
                      <input
                        type="text"
                        placeholder="کد پستی ۱۰ رقمی"
                        value={userForm.postal_code}
                        onChange={(e) => setUserForm({ ...userForm, postal_code: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">امتیاز اولیه</label>
                        <input
                          type="number"
                          value={userForm.points}
                          onChange={(e) => setUserForm({ ...userForm, points: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">سطح اولیه</label>
                        <input
                          type="number"
                          value={userForm.level}
                          onChange={(e) => setUserForm({ ...userForm, level: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">آدرس کامل منزل</label>
                    <textarea
                      rows={2}
                      placeholder="آدرس دقیق محل سکونت..."
                      value={userForm.address}
                      onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 cursor-pointer"
                    >
                      انصراف
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Check size={16} />
                      <span>{editingUser ? 'ذخیره بروزرسانی' : 'افزودن کاربر'}</span>
                    </button>
                  </div>

                </form>

              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. MISSIONS CRUD & EDIT TAB */}
      {activeAdminTab === 'missions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Target className="text-red-500" size={20} />
              <h3 className="text-sm font-black text-white">مدیریت و ویرایش مأموریت‌های عملیاتی</h3>
              <span className="bg-red-950/80 text-red-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-800">
                {missions.length} مأموریت
              </span>
            </div>
            <button
              onClick={handleOpenAddMission}
              className="bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-red-950/50 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>ایجاد مأموریت جدید</span>
            </button>
          </div>

          {/* Missions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map(m => (
              <div key={m.id} className="bg-[#080d21] border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between gap-3 transition-all group">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2.5 h-2.5 rounded-full ${m.is_active !== false ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`} />
                      <h4 className="font-black text-sm text-white group-hover:text-red-400 transition-colors">{m.title}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-amber-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-800/80">
                        سقف: {m.max_score}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${m.is_optional ? 'bg-cyan-950 text-cyan-300 border-cyan-800' : 'bg-rose-950 text-rose-300 border-rose-800'}`}>
                        {m.is_optional ? 'اختیاری' : 'مأموریت اصلی'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{m.description}</p>

                  {m.video_url && (
                    <div className="text-[11px] text-cyan-400 font-mono truncate bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                      <Video size={13} className="shrink-0 text-cyan-400" />
                      <span className="truncate">{m.video_url}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-1">
                  <button
                    onClick={() => handleToggleMissionActive(m)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                      m.is_active !== false
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Eye size={13} />
                    <span>{m.is_active !== false ? 'فعال (منتشرشده)' : 'غیرفعال (پیش‌نویس)'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditMission(m)}
                      className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-bold text-xs rounded-lg border border-cyan-800/80 transition flex items-center gap-1 cursor-pointer"
                      title="ویرایش مأموریت"
                    >
                      <Edit3 size={14} />
                      <span>ویرایش</span>
                    </button>
                    <button
                      onClick={() => handleDeleteMission(m)}
                      className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800 transition cursor-pointer"
                      title="حذف مأموریت"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* MISSION EDIT/CREATE MODAL */}
          {showMissionModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
              <div className="bg-[#090d20] border border-red-900/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between bg-slate-950 px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Target className="text-red-500" size={20} />
                    <h3 className="font-black text-sm text-white">
                      {editingMission ? `ویرایش مأموریت: ${editingMission.title}` : 'تعریف مأموریت جدید'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowMissionModal(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveMissionSubmit} className="p-5 space-y-4 overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">عنوان مأموریت:</label>
                    <input
                      type="text"
                      placeholder="مثال: عملیات احراز هویت سایبری..."
                      value={missionForm.title}
                      onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">سقف امتیاز:</label>
                      <input
                        type="number"
                        placeholder="100"
                        value={missionForm.max_score}
                        onChange={(e) => setMissionForm({ ...missionForm, max_score: parseInt(e.target.value, 10) || 100 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">نوع مأموریت:</label>
                      <select
                        value={missionForm.is_optional ? 'optional' : 'mandatory'}
                        onChange={(e) => setMissionForm({ ...missionForm, is_optional: e.target.value === 'optional' })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                      >
                        <option value="mandatory">اصلی / اجباری</option>
                        <option value="optional">اختیاری / امتیازی</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">وضعیت انتشار:</label>
                      <select
                        value={missionForm.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setMissionForm({ ...missionForm, is_active: e.target.value === 'active' })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                      >
                        <option value="active">فعال و قابل مشاهده</option>
                        <option value="inactive">غیرفعال (پیش‌نویس)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">شرح کامل دستورالعمل مأموریت:</label>
                    <textarea
                      rows={4}
                      placeholder="توضیحات مفصل در خصوص اهداف، نحوه ارسال فایل و قوانین مأموریت..."
                      value={missionForm.description}
                      onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">لینک پوستر / عکس بنر (اختیاری):</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={missionForm.banner_path}
                        onChange={(e) => setMissionForm({ ...missionForm, banner_path: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none dir-ltr"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">لینک ویدیو یا رسانه آموزشی (اختیاری):</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={missionForm.video_url}
                        onChange={(e) => setMissionForm({ ...missionForm, video_url: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none dir-ltr"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowMissionModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={16} />
                      <span>{editingMission ? 'ذخیره تغییرات مأموریت' : 'ایجاد و انتشار مأموریت'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🎁 PRIZES & AWARDS SHOWCASE MANAGEMENT TAB */}
      {activeAdminTab === 'prizes' && (
        <div className="space-y-6">
          <div className="bg-[#080d21] border border-amber-500/40 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Gift size={22} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">مدیریت ویترین جایزه‌ها</h3>
                  <p className="text-xs text-slate-400">تعریف، ویرایش، حذف و تنظیم کریستال‌ها و امتیازات مورد نیاز برای جوایز سامانه</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {prizes.filter(p => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'].includes(p.id)).length > 0 && (
                  <button
                    onClick={handleClearAllPrizes}
                    className="px-3.5 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="حذف کلیه جوایز موجود"
                  >
                    <Trash2 size={15} />
                    <span>پاکسازی همه جوایز</span>
                  </button>
                )}

                <button
                  onClick={handleOpenCreatePrize}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] cursor-pointer"
                >
                  <Plus size={16} />
                  <span>افزودن جایزه جدید</span>
                </button>
              </div>
            </div>

            {(() => {
              const cleanPrizes = prizes.filter(p => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'].includes(p.id));
              if (cleanPrizes.length === 0) {
                return (
                  <div className="text-center py-12 px-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                    <Gift size={32} className="text-amber-400 mx-auto opacity-80" />
                    <h4 className="text-sm font-bold text-white">هنوز جایزه‌ای ثبت نشده است</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      هیچ جایزه‌ای در سامانه وجود ندارد. لطفاً با زدن دکمه زیر، جایزه و امتیاز مورد نیاز آن را تعریف کنید تا در ویترین جایزه‌ها برای رزمندگان نمایش داده شود.
                    </p>
                    <button
                      onClick={handleOpenCreatePrize}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer"
                    >
                      ایجاد اولین جایزه
                    </button>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cleanPrizes.map((prize) => (
                    <div
                      key={prize.id}
                      className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {prize.tag || 'جایزه اختصاصی'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            موجودی: {formatToPersianDigits(prize.stockCount)} عدد
                          </span>
                        </div>

                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative">
                          <img 
                            src={prize.imageUrl} 
                            alt={prize.title} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80';
                            }}
                          />
                        </div>

                        <h4 className="text-xs font-bold text-white line-clamp-2">{prize.title}</h4>
                        
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400">کریستال / امتیاز لازم:</span>
                          <span className="text-amber-300 font-black font-mono">
                            {formatToPersianDigits(prize.requiredPoints)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleOpenEditPrize(prize)}
                          className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <span>ویرایش</span>
                        </button>
                        <button
                          onClick={() => handleDeletePrize(prize.id, prize.title)}
                          className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 transition cursor-pointer"
                          title="حذف جایزه"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Modal for Creating / Editing Prize */}
          {showPrizeModal && (
            <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
              <div className="bg-[#0b1226] border border-amber-500/50 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 text-white shadow-2xl relative my-auto max-h-[85vh] sm:max-h-[88vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                    <Gift size={18} />
                    <span>{editingPrize ? 'ویرایش جایزه' : 'افزودن جایزه جدید'}</span>
                  </h3>
                  <button
                    onClick={() => setShowPrizeModal(false)}
                    className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSavePrize} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">عنوان کامل جایزه:</label>
                    <input
                      type="text"
                      placeholder="مثال: تبلت هوشمند دانش‌آموزی، کنسول بازی، بسته هدیه فرهنگی..."
                      value={prizeForm.title}
                      onChange={(e) => setPrizeForm({ ...prizeForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">دسته‌بندی:</label>
                      <select
                        value={prizeForm.category}
                        onChange={(e) => setPrizeForm({ ...prizeForm, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="gaming">گیمینگ و کنسول</option>
                        <option value="digital">تبلت و دوربین</option>
                        <option value="gadgets">گجت‌های هوشمند</option>
                        <option value="gear">تجهیزات و رصد</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">کریستال / امتیاز لازم:</label>
                      <input
                        type="number"
                        min={1}
                        value={prizeForm.requiredPoints}
                        onChange={(e) => setPrizeForm({ ...prizeForm, requiredPoints: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">تعداد موجودی:</label>
                      <input
                        type="number"
                        min={1}
                        value={prizeForm.stockCount}
                        onChange={(e) => setPrizeForm({ ...prizeForm, stockCount: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">برچسب روی کارت:</label>
                      <input
                        type="text"
                        placeholder="مثال: جایزه ویژه کشور"
                        value={prizeForm.tag}
                        onChange={(e) => setPrizeForm({ ...prizeForm, tag: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">آدرس تصویر (URL):</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={prizeForm.imageUrl}
                      onChange={(e) => setPrizeForm({ ...prizeForm, imageUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 self-center">تصاویر پیشنهادی سریع:</span>
                      {[
                        { label: 'کنسول گیمینگ', url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80' },
                        { label: 'تبلت هوشمند', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80' },
                        { label: 'دوربین عکاسی', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80' },
                        { label: 'ساعت هوشمند', url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80' },
                        { label: 'هدفون گیمینگ', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80' },
                        { label: 'بسته هدیه نفیس', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPrizeForm({ ...prizeForm, imageUrl: preset.url })}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPrizeModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                    >
                      ذخیره جایزه
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. MEDALS & MANUAL AWARDING TAB */}
      {activeAdminTab === 'medals' && (
        <div className="space-y-6">
          
          {/* Manual Award Box */}
          <div className="bg-[#080d21] border border-amber-800/80 p-5 rounded-2xl space-y-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Award className="text-amber-400" size={20} />
              <h3 className="text-sm font-black text-white">اهدای دستی مدال به رزمنده با کد اختصاصی ۹ رقمی</h3>
            </div>

            <form onSubmit={handleAwardMedalSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">کد اختصاصی ۹ رقمی کاربر:</label>
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="مثال: 839201745"
                    value={awardPersonalCode}
                    onChange={(e) => setAwardPersonalCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">انتخاب نشان / مدال افتخار:</label>
                  <select
                    value={awardMedalId}
                    onChange={(e) => setAwardMedalId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {medals.map(m => (
                      <option key={m.id} value={m.id}>{m.image} {m.name} ({m.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">علت و متن تقدیرنامه اهدا:</label>
                <input
                  type="text"
                  placeholder="مثال: تقدیر ویژه ستاد جهت کسب رتبه اول در چالش سایبری..."
                  value={awardNote}
                  onChange={(e) => setAwardNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Award size={16} />
                <span>اهدا و ثبت در پرونده رزمنده</span>
              </button>
            </form>
          </div>

          {/* Medals List & Add Medal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400">فهرست نشان‌های تعریف‌شده در سیستم:</h3>
              <button
                onClick={() => setShowNewMedalModal(true)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                + تعریف مدال جدید
              </button>
            </div>

            {showNewMedalModal && (
              <form onSubmit={handleCreateMedal} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="نام نشان"
                    value={newMedal.name}
                    onChange={(e) => setNewMedal({ ...newMedal, name: e.target.value })}
                    className="bg-slate-900 border border-slate-800 p-2 text-xs text-white rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    placeholder="آیکن / ایموجی نشان (مثال: 🎖️)"
                    value={newMedal.image}
                    onChange={(e) => setNewMedal({ ...newMedal, image: e.target.value })}
                    className="bg-slate-900 border border-slate-800 p-2 text-xs text-white rounded-lg"
                  />
                </div>

                <input
                  type="text"
                  placeholder="توضیحات مدال"
                  value={newMedal.description}
                  onChange={(e) => setNewMedal({ ...newMedal, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 p-2 text-xs text-white rounded-lg"
                />

                <button type="submit" className="w-full bg-amber-500 text-black font-bold text-xs py-2 rounded-lg">
                  ذخیره مدال
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medals.map(m => (
                <div key={m.id} className="bg-[#080d21] border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                  <span className="text-2xl p-2 bg-slate-950 rounded-lg border border-slate-800">{m.image}</span>
                  <div>
                    <h4 className="font-extrabold text-xs text-white">{m.name}</h4>
                    <p className="text-[11px] text-slate-400">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 5. SUPPORT TICKETS MANAGEMENT TAB */}
      {activeAdminTab === 'tickets' && (
        <div className="space-y-4">
          
          {/* Real-time Status Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div 
              onClick={() => setTicketStatusFilter('all')}
              className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                ticketStatusFilter === 'all' 
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'bg-[#080d21] border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] text-slate-400 block font-bold">کل تیکت‌ها</span>
              <span className="text-base font-black text-white font-mono mt-0.5 block">{formatToPersianDigits(tickets.length)}</span>
            </div>

            <div 
              onClick={() => setTicketStatusFilter('open')}
              className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                ticketStatusFilter === 'open' 
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'bg-[#080d21] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[10px] text-amber-300 font-bold">در انتظار بررسی</span>
              </div>
              <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
                {formatToPersianDigits(tickets.filter(t => t.status === 'open').length)}
              </span>
            </div>

            <div 
              onClick={() => setTicketStatusFilter('in_progress')}
              className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                ticketStatusFilter === 'in_progress' 
                  ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]' 
                  : 'bg-[#080d21] border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] text-blue-300 block font-bold">در حال بررسی</span>
              <span className="text-base font-black text-blue-400 font-mono mt-0.5 block">
                {formatToPersianDigits(tickets.filter(t => t.status === 'in_progress').length)}
              </span>
            </div>

            <div 
              onClick={() => setTicketStatusFilter('answered')}
              className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                ticketStatusFilter === 'answered' 
                  ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                  : 'bg-[#080d21] border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] text-emerald-300 block font-bold">پاسخ داده شده</span>
              <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                {formatToPersianDigits(tickets.filter(t => t.status === 'answered').length)}
              </span>
            </div>

            <div 
              onClick={() => setTicketStatusFilter('closed')}
              className={`p-3 rounded-xl border text-center cursor-pointer transition col-span-2 sm:col-span-1 ${
                ticketStatusFilter === 'closed' 
                  ? 'bg-slate-800 border-slate-600' 
                  : 'bg-[#080d21] border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] text-slate-400 block font-bold">بسته شده</span>
              <span className="text-base font-black text-slate-400 font-mono mt-0.5 block">
                {formatToPersianDigits(tickets.filter(t => t.status === 'closed').length)}
              </span>
            </div>
          </div>

          {/* Search and Category Filters */}
          <div className="bg-[#080d21] p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={ticketSearchTerm}
                  onChange={(e) => setTicketSearchTerm(e.target.value)}
                  placeholder="جستجوی تیکت بر اساس نام رزمنده، کد اختصاصی، موضوع، شماره تیکت..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto text-[11px] font-bold">
                <button
                  onClick={() => setTicketStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition ${ticketStatusFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                  همه وضعیت‌ها
                </button>
                <button
                  onClick={() => setTicketStatusFilter('open')}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition ${ticketStatusFilter === 'open' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-amber-300/70 hover:text-amber-300'}`}
                >
                  در انتظار
                </button>
                <button
                  onClick={() => setTicketStatusFilter('in_progress')}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition ${ticketStatusFilter === 'in_progress' ? 'bg-blue-500 text-slate-950 font-black' : 'bg-slate-900 text-blue-300/70 hover:text-blue-300'}`}
                >
                  در حال بررسی
                </button>
                <button
                  onClick={() => setTicketStatusFilter('answered')}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition ${ticketStatusFilter === 'answered' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-emerald-300/70 hover:text-emerald-300'}`}
                >
                  پاسخ داده شده
                </button>
                <button
                  onClick={() => setTicketStatusFilter('closed')}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition ${ticketStatusFilter === 'closed' ? 'bg-slate-700 text-white font-black' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
                >
                  بسته شده
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs font-bold whitespace-nowrap touch-pan-x">
              <span className="text-slate-400 shrink-0 text-[11px]">فیلتر حوزه تخصصی:</span>
              <button
                onClick={() => setTicketSpecFilter('all')}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition ${ticketSpecFilter === 'all' ? 'bg-amber-500 text-black font-black' : 'bg-slate-900 text-slate-300 hover:text-white'}`}
              >
                همه حوزه‌ها
              </button>
              <button
                onClick={() => setTicketSpecFilter('technical')}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition ${ticketSpecFilter === 'technical' ? 'bg-cyan-500 text-black font-black' : 'bg-slate-900 text-cyan-300/70 hover:text-cyan-300'}`}
              >
                فنی و سامانه (technical)
              </button>
              <button
                onClick={() => setTicketSpecFilter('judge')}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition ${ticketSpecFilter === 'judge' ? 'bg-amber-500 text-black font-black' : 'bg-slate-900 text-amber-300/70 hover:text-amber-300'}`}
              >
                داوری و امتیاز (judge)
              </button>
              <button
                onClick={() => setTicketSpecFilter('content')}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition ${ticketSpecFilter === 'content' ? 'bg-purple-500 text-black font-black' : 'bg-slate-900 text-purple-300/70 hover:text-purple-300'}`}
              >
                محتوا و آموزش (content)
              </button>
              <button
                onClick={() => setTicketSpecFilter('other')}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition ${ticketSpecFilter === 'other' ? 'bg-slate-600 text-white font-black' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
              >
                تغییر جوخه و عمومی (other)
              </button>
            </div>
          </div>

          {/* Tickets Cards List */}
          <div className="space-y-3.5">
            {filteredTickets.map(t => {
              const ticketReplies = replies.filter(r => r.ticket_id === t.id);

              return (
                <div key={t.id} className="bg-[#080d21] border border-slate-800 p-4 rounded-2xl space-y-3.5 text-xs shadow-lg">
                  
                  {/* Top Bar: User Info + Status + Quick Status Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-amber-400">#{t.id}</span>
                      <span className="font-black text-white text-sm">{t.user_name}</span>
                      <span className="text-slate-400 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        کد: {formatToPersianDigits(t.personal_code)}
                      </span>
                      <span className="bg-slate-950 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 rounded text-[10px] font-bold">
                        {t.type === 'technical' ? 'پشتیبانی فنی' :
                         t.type === 'judge' ? 'داوری و امتیاز' :
                         t.type === 'content' ? 'محتوا و آموزش' : 'عمومی / جوخه'}
                      </span>
                      {t.priority === 'urgent' && (
                        <span className="bg-rose-950 text-rose-300 border border-rose-600/50 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle size={10} /> فوری
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Current Status Badge */}
                      {t.status === 'open' ? (
                        <span className="bg-amber-950 text-amber-300 border border-amber-500/60 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          <span>در انتظار بررسی</span>
                        </span>
                      ) : t.status === 'in_progress' ? (
                        <span className="bg-blue-950 text-blue-300 border border-blue-500/60 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                          <RefreshCw size={11} className="animate-spin text-blue-400" />
                          <span>در حال بررسی مدیر</span>
                        </span>
                      ) : t.status === 'answered' ? (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-400/80 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={11} className="text-emerald-400" />
                          <span>پاسخ داده شده</span>
                        </span>
                      ) : (
                        <span className="bg-slate-900 text-slate-400 border border-slate-700 text-[10px] font-medium px-2.5 py-1 rounded-full">
                          بسته شده
                        </span>
                      )}

                      <span className="text-slate-500 font-mono text-[10px]">{t.created_at}</span>
                    </div>
                  </div>

                  {/* Subject & Original Message */}
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-sm text-slate-100">{t.subject}</h4>
                    <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-wrap">
                      {t.message}
                    </p>
                    {t.attachment_url && (
                      <a 
                        href={t.attachment_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 underline hover:text-cyan-300 pt-1"
                      >
                        مشاهده فایل/لینک ضمیمه کاربر
                      </a>
                    )}
                  </div>

                  {/* Conversation Thread History */}
                  {ticketReplies.length > 0 && (
                    <div className="space-y-2 bg-[#050816] p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">تاریخچه گفتگو و پاسخ‌ها:</span>
                      {ticketReplies.map(rep => (
                        <div 
                          key={rep.id} 
                          className={`p-2.5 rounded-xl text-xs space-y-1 ${
                            rep.is_admin 
                              ? 'bg-amber-950/40 border border-amber-500/40 text-amber-200 mr-2' 
                              : 'bg-slate-900/90 border border-slate-800 text-slate-200 ml-2'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] border-b border-slate-800/50 pb-1">
                            <span className={rep.is_admin ? 'text-amber-300 font-black' : 'text-cyan-300 font-bold'}>
                              {rep.is_admin ? '🛡️ پاسخ داور / ستاد مدیریت' : `👤 ${rep.user_name} (رزمنده)`}
                            </span>
                            <span className="text-slate-500 font-mono">{rep.created_at}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{rep.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Action Status Toggles */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-bold">تغییر وضعیت سریع:</span>
                      <button
                        onClick={() => handleAdminChangeTicketStatus(t.id, 'in_progress')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                          t.status === 'in_progress' 
                            ? 'bg-blue-500 text-slate-950 border-blue-400' 
                            : 'bg-slate-900 text-blue-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        در حال بررسی
                      </button>
                      <button
                        onClick={() => handleAdminChangeTicketStatus(t.id, 'answered')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                          t.status === 'answered' 
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                            : 'bg-slate-900 text-emerald-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        پاسخ داده شده
                      </button>
                      <button
                        onClick={() => handleAdminChangeTicketStatus(t.id, 'closed')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                          t.status === 'closed' 
                            ? 'bg-slate-700 text-white border-slate-600' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        بستن تیکت
                      </button>
                      <button
                        onClick={() => handleAdminChangeTicketStatus(t.id, 'open')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                          t.status === 'open' 
                            ? 'bg-amber-500 text-slate-950 border-amber-400' 
                            : 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        بازگشایی (در صف)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdminDeleteTicket(t.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition"
                        title="حذف تیکت"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Reply Box */}
                  {replyTicketId === t.id ? (
                    <div className="space-y-3 pt-2 bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/40">
                      
                      {/* Predefined Quick Answer Templates */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">پاسخ‌های آماده / پیش‌فرض:</span>
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setAdminReplyText('سلام رزمنده گرامی. موضوع بررسی شد و مشکل فنی سامانه رفع گردید. لطفاً مجدداً اقدام فرمایید.')}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-800 transition"
                          >
                            ✓ مشکل بررسی و رفع شد
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminReplyText('سلام، درخواست شما برای بررسی مجدد امتیاز مأموریت به داور ارشد ارجاع داده شد و نتیجه در همین تیکت اعلام خواهد شد.')}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-800 transition"
                          >
                            ✓ ارجاع به سرداور مأموریت
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminReplyText('اطلاعات جوخه و عضویت شما در سامانه بروزرسانی گردید. می‌توانید در داشبورد خود وضعیت را مشاهده فرمایید.')}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-800 transition"
                          >
                            ✓ بروزرسانی اطلاعات جوخه
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminReplyText('لطفاً مشخصات دقیق‌تر، اسکرین‌شات از خطا یا شماره مأموریت را در پاسخ همین پیام ارسال نمایید.')}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-800 transition"
                          >
                            ✓ درخواست اطلاعات تکمیلی
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder="متن پاسخ رسمی کارشناس یا داور ستاد اتاق جنگ..."
                        className="w-full bg-[#040716] border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none transition placeholder-slate-500 leading-relaxed"
                      />

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                          <span>وضعیت تیکت پس از ارسال:</span>
                          <select
                            value={adminReplyMarkStatus}
                            onChange={(e) => setAdminReplyMarkStatus(e.target.value as 'answered' | 'in_progress')}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-bold outline-none"
                          >
                            <option value="answered">پاسخ داده شده</option>
                            <option value="in_progress">در حال بررسی و رسیدگی</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button 
                            type="button"
                            onClick={() => setReplyTicketId(null)} 
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                          >
                            انصراف
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleAdminSendReply(t)} 
                            className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                          >
                            <Send size={13} />
                            <span>ثبت و ارسال پاسخ</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setReplyTicketId(t.id);
                          setAdminReplyText('');
                        }}
                        className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-amber-300 font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition text-xs cursor-pointer shadow-sm"
                      >
                        <MessageSquare size={14} />
                        <span>ارسال پاسخ یا تغییر وضعیت</span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="p-8 text-center bg-[#080d21] rounded-2xl border border-dashed border-slate-800 space-y-2">
                <HelpCircle size={32} className="mx-auto text-slate-600" />
                <p className="text-xs font-bold text-slate-300">هیچ تیکتی با مشخصات فیلترشده یافت نشد.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeAdminTab === 'payments' && (
        <AdminPaymentsPanel
          settings={paymentSettings}
          setSettings={setPaymentSettings}
          transactions={paymentTransactions}
          triggerAlert={triggerAlert}
        />
      )}

      {/* 6. TRAININGS CRUD & EDIT TAB */}
      {activeAdminTab === 'trainings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="text-cyan-400" size={20} />
              <h3 className="text-sm font-black text-white">مدیریت و ویرایش دوره‌های آموزشی آکادمی</h3>
              <span className="bg-cyan-950/80 text-cyan-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-cyan-800">
                {trainings.length} دوره آموزشی
              </span>
            </div>
            <button
              onClick={handleOpenAddTraining}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-cyan-950/50 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>افزودن دوره آموزشی جدید</span>
            </button>
          </div>

          {/* Trainings List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainings.map(t => (
              <div key={t.id} className="bg-[#080d21] border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between gap-3 transition-all group">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2.5 h-2.5 rounded-full ${t.is_active !== false ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`} />
                      <h4 className="font-black text-sm text-white group-hover:text-cyan-400 transition-colors">{t.title}</h4>
                    </div>
                    <span className="bg-cyan-950 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-800/80">
                      {t.category || 'عمومی'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{t.description}</p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">
                      مخاطب: {t.target_role === 'all' ? 'همه رزمندگان' : t.target_role}
                    </span>
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">
                      نوع رسانه: {t.media_type || 'ویدیو'}
                    </span>
                  </div>

                  {(t.video_url || t.media_path) && (
                    <div className="text-[11px] text-cyan-400 font-mono truncate bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 dir-ltr">
                      <Video size={13} className="shrink-0 text-cyan-400" />
                      <span className="truncate">{t.video_url || t.media_path}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-1">
                  <button
                    onClick={() => handleToggleTrainingActive(t)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                      t.is_active !== false
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Eye size={13} />
                    <span>{t.is_active !== false ? 'فعال (منتشرشده)' : 'غیرفعال (پیش‌نویس)'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditTraining(t)}
                      className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-bold text-xs rounded-lg border border-cyan-800/80 transition flex items-center gap-1 cursor-pointer"
                      title="ویرایش آموزش"
                    >
                      <Edit3 size={14} />
                      <span>ویرایش</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTraining(t)}
                      className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800 transition cursor-pointer"
                      title="حذف آموزش"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TRAINING EDIT/CREATE MODAL */}
          {showTrainingModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
              <div className="bg-[#090d20] border border-cyan-900/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between bg-slate-950 px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="text-cyan-400" size={20} />
                    <h3 className="font-black text-sm text-white">
                      {editingTraining ? `ویرایش آموزش: ${editingTraining.title}` : 'افزودن دوره آموزشی جدید'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowTrainingModal(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveTrainingSubmit} className="p-5 space-y-4 overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">عنوان آموزش:</label>
                    <input
                      type="text"
                      placeholder="مثال: اصول پدافند غیرعامل و امنیت شبکه..."
                      value={trainingForm.title}
                      onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">دسته‌بندی:</label>
                      <input
                        type="text"
                        placeholder="مثال: پدافند و امنیت"
                        value={trainingForm.category}
                        onChange={(e) => setTrainingForm({ ...trainingForm, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">مخاطب هدف:</label>
                      <select
                        value={trainingForm.target_role}
                        onChange={(e) => setTrainingForm({ ...trainingForm, target_role: e.target.value as TargetRole })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                      >
                        <option value="all">همه کاربران / عمومی</option>
                        <option value="student">دانش‌آموزان</option>
                        <option value="teacher">معلمان / اساتید</option>
                        <option value="commander">فرماندهان</option>
                        <option value="squad_leader">سرگروه‌ها</option>
                        <option value="admin">مدیران سیستم</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">نوع رسانه:</label>
                      <select
                        value={trainingForm.media_type}
                        onChange={(e) => setTrainingForm({ ...trainingForm, media_type: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                      >
                        <option value="video">ویدیو و فایل تصویری</option>
                        <option value="audio">فایل صوتی و پادکست</option>
                        <option value="document">سند و جزوه مکتوب</option>
                        <option value="image">تصویر و پوستر</option>
                        <option value="iframe">پخش‌کننده تعبیه شده</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">شرح و محتوای دوره آموزشی:</label>
                    <textarea
                      rows={4}
                      placeholder="سرفصل‌ها و توضیحات کامل دوره..."
                      value={trainingForm.description}
                      onChange={(e) => setTrainingForm({ ...trainingForm, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>

                  {/* Enhanced Dual Media Input: Link or File Upload */}
                  <div className="space-y-2 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Video size={16} className="text-cyan-400" />
                        <span>منبع ویدیو و محتوای دوره آموزشی:</span>
                      </label>
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setTrainingVideoMode('url')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            trainingVideoMode === 'url' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          لینک ویدیو (URL)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrainingVideoMode('upload')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            trainingVideoMode === 'upload' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Upload size={13} />
                          <span>آپلود مستقیم ویدیو</span>
                        </button>
                      </div>
                    </div>

                    {trainingVideoMode === 'url' ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="آدرس اینترنتی مستقیم فایل ویدیو (مثال: https://.../video.mp4)..."
                          value={trainingForm.video_url}
                          onChange={(e) => setTrainingForm({ ...trainingForm, video_url: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 outline-none dir-ltr"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-900/60 rounded-xl p-4 text-center cursor-pointer transition relative group">
                          <input
                            type="file"
                            accept="video/*,audio/*,image/*,.pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
                                setTrainingUploadedFileName(file.name);
                                setTrainingUploadedFileSize(`${sizeMb} مگابایت`);
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const result = event.target?.result as string;
                                  setTrainingForm({
                                    ...trainingForm,
                                    video_url: result,
                                    media_path: file.name
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <Upload className="mx-auto text-cyan-400 mb-1 group-hover:scale-110 transition-transform" size={24} />
                          <p className="text-xs font-bold text-slate-200">برای انتخاب ویدیو کلیک کنید یا فایل را بکشید و رها کنید</p>
                          <p className="text-[10px] text-slate-400 mt-1">پشتیبانی کامل از تمامی فرمت‌های MP4, WEBM, MOV, MP3, PDF</p>
                        </div>
                        {trainingUploadedFileName && (
                          <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs">
                            <span className="text-cyan-300 font-bold truncate dir-ltr">{trainingUploadedFileName} ({trainingUploadedFileSize})</span>
                            <span className="text-emerald-400 text-[10px] font-bold">آپلود و آماده‌سازی شد ✓</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Instant Video Player Preview */}
                    {(trainingForm.video_url || trainingForm.media_path) && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 block">پیش‌نمایش زنده ویدیو و فایل:</span>
                        <div className="rounded-xl overflow-hidden bg-black border border-slate-800">
                          <video 
                            src={trainingForm.video_url || trainingForm.media_path} 
                            controls 
                            className="w-full h-40 object-cover" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">وضعیت انتشار:</label>
                    <select
                      value={trainingForm.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setTrainingForm({ ...trainingForm, is_active: e.target.value === 'active' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                    >
                      <option value="active">فعال و در دسترس</option>
                      <option value="inactive">غیرفعال (پیش‌نویس)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowTrainingModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={16} />
                      <span>{editingTraining ? 'ذخیره تغییرات دوره' : 'ایجاد و انتشار دوره'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. SITE CONTENT & PAGES CMS TAB */}
      {activeAdminTab === 'site_editor' && (
        <div className="space-y-6">
          
          {/* Main CMS Header Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/80 to-slate-900 border border-cyan-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
                <SlidersHorizontal size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>مدیریت جامع و هوشمند صفحه اصلی سایت</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  تمامی بنرها، عناوین، لوگو، ویدئوها و کلیدهای تعاملی صفحه اول را ویرایش، جابه‌جا و منتشر کنید.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => setIsElementorOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                id="btn-open-elementor-studio"
              >
                <Layout size={18} />
                <span>ورود به استودیوی ویرایش و چیدمان دیداری</span>
              </button>

              <button
                onClick={() => {
                  setSiteSettings({
                    siteName: cmsSiteName,
                    siteTagline: cmsSiteTagline,
                    badgeText: cmsBadgeText,
                    heroTitle: generalTitle,
                    heroProgress: generalProgress,
                    heroCountdown: generalCountdown,
                    heroImage: generalImage,
                    heroVideoUrl: heroVideoUrl,
                    teaserVideoUrl: teaserVideoUrl,
                    girlsBannerImage: girlsBannerImage,
                    boysBannerImage: boysBannerImage,
                    heroButtonText: generalBtnText,
                    contactPhone: generalPhone,
                    contactEmail: generalEmail,
                    telegram: generalTelegram,
                    baleLink: baleLink,
                    eitaaLink: eitaaLink,
                    address: generalAddress,
                    aboutText: generalAboutText,
                    prizeTitle: prizeTitle,
                    prizeDescription: prizeDescription,
                    homeButtons: homeButtons
                  });
                  triggerAlert('تمامی تغییرات، کلیدهای تعاملی و محتوای صفحه اصلی با موفقیت ذخیره و منتشر شد!');
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                id="btn-save-master-cms"
              >
                <Check size={18} />
                <span>ذخیره نهایی و انتشار</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC INTERACTIVE BUTTONS BUILDER SECTION */}
          <div className="bg-[#080d21] border border-cyan-500/30 p-5 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="text-cyan-400" size={20} />
                <div>
                  <h4 className="font-extrabold text-sm text-white">مدیریت، چیدمان و ساخت کلیدهای تعاملی صفحه اصلی</h4>
                  <p className="text-[11px] text-slate-400">ترتیب کلیدها، عنوان، آیکون، شکل، رنگ و صفحه مقصد را مستقیماً تنظیم کنید</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newBtn: HomeButtonConfig = {
                    id: `btn-${Date.now()}`,
                    text: 'دکمه جدید صفحه اصلی',
                    actionTab: 'Missions',
                    iconName: 'Shield',
                    shape: 'rounded-2xl',
                    size: 'md',
                    color: 'cyan',
                    order: homeButtons.length + 1,
                    isActive: true
                  };
                  setHomeButtons([...homeButtons, newBtn]);
                  triggerAlert('دکمه جدید اضافه شد. تنظیمات آن را ویرایش کنید.');
                }}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer shadow"
              >
                <Plus size={16} />
                <span>افزودن دکمه جدید</span>
              </button>
            </div>

            {/* List of Configured Buttons with Up/Down Actions & Live Preview */}
            <div className="space-y-3">
              {homeButtons.sort((a,b) => a.order - b.order).map((btn, index) => {
                const isFirst = index === 0;
                const isLast = index === homeButtons.length - 1;

                return (
                  <div key={btn.id} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 transition hover:border-cyan-500/40">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-xs font-black flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <span className="font-black text-xs text-white">{btn.text || 'بدون عنوان'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${btn.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                          {btn.isActive ? 'فعال در صفحه' : 'مخفی شده'}
                        </span>
                      </div>

                      {/* Move Up / Move Down & Delete Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => {
                            if (isFirst) return;
                            const updated = [...homeButtons];
                            const temp = updated[index];
                            updated[index] = updated[index - 1];
                            updated[index - 1] = temp;
                            updated.forEach((b, i) => b.order = i + 1);
                            setHomeButtons(updated);
                          }}
                          className={`p-1.5 rounded-lg border transition ${isFirst ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600' : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-400'}`}
                          title="انتقال به بالا (ترتیب جابه‌جایی)"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => {
                            if (isLast) return;
                            const updated = [...homeButtons];
                            const temp = updated[index];
                            updated[index] = updated[index + 1];
                            updated[index + 1] = temp;
                            updated.forEach((b, i) => b.order = i + 1);
                            setHomeButtons(updated);
                          }}
                          className={`p-1.5 rounded-lg border transition ${isLast ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600' : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-400'}`}
                          title="انتقال به پایین (ترتیب جابه‌جایی)"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (homeButtons.length <= 1) {
                              triggerAlert('حداقل وجود یک دکمه در صفحه اصلی الزامی است.');
                              return;
                            }
                            const updated = homeButtons.filter(b => b.id !== btn.id);
                            updated.forEach((b, i) => b.order = i + 1);
                            setHomeButtons(updated);
                          }}
                          className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg transition"
                          title="حذف دکمه"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Button Properties Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 block">متن دکمه:</label>
                        <input
                          type="text"
                          value={btn.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHomeButtons(prev => prev.map(b => b.id === btn.id ? { ...b, text: val } : b));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 block">صفحه مقصد کلیک:</label>
                        <select
                          value={btn.actionTab}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHomeButtons(prev => prev.map(b => b.id === btn.id ? { ...b, actionTab: val } : b));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                        >
                          <option value="register">ورود و ثبت‌نام در مسابقه</option>
                          <option value="Dashboard">پنل کاربری رزمنده</option>
                          <option value="Missions">لیست مأموریت‌های عملیاتی</option>
                          <option value="RewardsLeaderboard">جدول برترین‌ها و جوایز</option>
                          <option value="Trainings">آکادمی دوره‌های آموزشی</option>
                          <option value="SupportTicket">ارتباط و تیکت پشتیبانی</option>
                          <option value="Vitrin">ویترین عمومی آثار</option>
                          <option value="About">درباره ما و اهداف قرارگاه</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 block">رنگ و پوسته دکمه:</label>
                        <select
                          value={btn.color}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setHomeButtons(prev => prev.map(b => b.id === btn.id ? { ...b, color: val } : b));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                        >
                          <option value="red">قرمز ستادی</option>
                          <option value="cyan">فیروزه‌ای سایبری</option>
                          <option value="amber">طلایی افتخار</option>
                          <option value="emerald">زمردی پیشرفت</option>
                          <option value="purple">بنفش تاکتیکی</option>
                          <option value="slate">دودی تاریک</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 block">شکل و انحنای گوشه‌ها:</label>
                        <select
                          value={btn.shape}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setHomeButtons(prev => prev.map(b => b.id === btn.id ? { ...b, shape: val } : b));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                        >
                          <option value="rounded-2xl">کپسولی نرم</option>
                          <option value="rounded-full">بیضی کامل</option>
                          <option value="rounded-lg">مستطیلی شیک</option>
                          <option value="rounded-3xl">خمیده تاکتیکی</option>
                          <option value="rounded-xl">گوشه‌های گرد</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-900">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 block">اندازه دکمه:</label>
                        <select
                          value={btn.size}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setHomeButtons(prev => prev.map(b => b.id === btn.id ? { ...b, size: val } : b));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                        >
                          <option value="sm">کوچک</option>
                          <option value="md">متوسط</option>
                          <option value="lg">بزرگ و برجسته</option>
                          <option value="full">عرض کامل</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 block">آیکون دکمه:</label>
                        <select
                          value={btn.iconName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHomeButtons(prev => prev.map(b => b.id === btn.id ? { ...b, iconName: val } : b));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                        >
                          <option value="UserPlus">ثبت‌نام و عضویت</option>
                          <option value="Shield">مأموریت و دفاع</option>
                          <option value="Trophy">جوایز و جام قهرمانی</option>
                          <option value="Gem">کریستال و پاداش</option>
                          <option value="Sparkles">جلوه و افکت</option>
                          <option value="BookOpen">آموزش و دوره‌ها</option>
                          <option value="MessageSquare">پشتیبانی و پیام</option>
                          <option value="Phone">تماس با ستاد</option>
                          <option value="Zap">پیشتاز و فوری</option>
                          <option value="Play">ویدیو و کلیپ</option>
                          <option value="Star">ستاره و افتخار</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id={`chk-btn-active-${btn.id}`}
                          checked={btn.isActive}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setHomeButtons(prev => prev.map(b => b.id === btn.id ? { ...b, isActive: val } : b));
                          }}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                        />
                        <label htmlFor={`chk-btn-active-${btn.id}`} className="text-xs font-bold text-slate-200 cursor-pointer">
                          نمایش و انتشار دکمه در صفحه اصلی
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Layout for General Site Content & Banners */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            
            {/* Column 1: General Brand, Logo, Banners & Hero Video */}
            <div className="bg-[#080d21] border border-slate-800 p-4 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <FileText className="text-cyan-400" size={16} />
                <h4 className="font-extrabold text-slate-200">مدیریت لوگو، عنوان، بنرها و ویدئوی اصلی هیرو</h4>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">عنوان اصلی سامانه:</label>
                    <input 
                      type="text" 
                      value={cmsSiteName} 
                      onChange={(e) => setCmsSiteName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">متن مدال بالای لوگو:</label>
                    <input 
                      type="text" 
                      value={cmsBadgeText} 
                      onChange={(e) => setCmsBadgeText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">توضیحات کوتاه هدر (زیرعنوان هیرو):</label>
                  <input 
                    type="text" 
                    value={cmsSiteTagline} 
                    onChange={(e) => setCmsSiteTagline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">عنوان اصلی مأموریت (هیرو):</label>
                  <input 
                    type="text" 
                    value={generalTitle} 
                    onChange={(e) => setGeneralTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                {/* Main Logo Path / Upload */}
                <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <label className="text-slate-300 font-bold block flex items-center justify-between">
                    <span>آدرس تصویر لوگوی اصلی سایت:</span>
                    <label className="text-cyan-400 text-[10px] cursor-pointer hover:underline flex items-center gap-1">
                      <Upload size={11} />
                      <span>انتخاب فایل لوگو</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setGeneralImage(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </label>
                  <input 
                    type="text" 
                    value={generalImage} 
                    placeholder="آدرس URL یا مسیر لوگو..."
                    onChange={(e) => setGeneralImage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-[10px] dir-ltr"
                  />
                </div>

                {/* Hero Video URL / Upload */}
                <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <label className="text-slate-300 font-bold block flex items-center justify-between">
                    <span>آدرس ویدئوی معرفی اتاق جنگ (معرفی):</span>
                    <label className="text-cyan-400 text-[10px] cursor-pointer hover:underline flex items-center gap-1">
                      <Upload size={11} />
                      <span>انتخاب ویدیو</span>
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setHeroVideoUrl(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </label>
                  <input 
                    type="text" 
                    value={heroVideoUrl} 
                    placeholder="آدرس URL ویدئو (مثال: https://.../intro.mp4)..."
                    onChange={(e) => setHeroVideoUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-[10px] dir-ltr"
                  />
                </div>

                {/* Teaser Video URL / Upload */}
                <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <label className="text-slate-300 font-bold block flex items-center justify-between">
                    <span>آدرس تیزر رسمی مسابقات (تیزر سینمایی):</span>
                    <label className="text-cyan-400 text-[10px] cursor-pointer hover:underline flex items-center gap-1">
                      <Upload size={11} />
                      <span>انتخاب تیزر</span>
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setTeaserVideoUrl(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </label>
                  <input 
                    type="text" 
                    value={teaserVideoUrl} 
                    placeholder="آدرس URL تیزر (مثال: https://.../teaser.mp4)..."
                    onChange={(e) => setTeaserVideoUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-[10px] dir-ltr"
                  />
                </div>

                {/* Girls & Boys Banners */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <label className="text-slate-300 font-bold text-[11px] block">بنر ثبت‌نام دختران:</label>
                    <input 
                      type="text" 
                      value={girlsBannerImage} 
                      placeholder="آدرس تصویر بنر دختران..."
                      onChange={(e) => setGirlsBannerImage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white text-[10px] dir-ltr"
                    />
                  </div>
                  <div className="space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <label className="text-slate-300 font-bold text-[11px] block">بنر ثبت‌نام پسران:</label>
                    <input 
                      type="text" 
                      value={boysBannerImage} 
                      placeholder="آدرس تصویر بنر پسران..."
                      onChange={(e) => setBoysBannerImage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white text-[10px] dir-ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">متن دکمه بنر ثبت‌نام:</label>
                    <input 
                      type="text" 
                      value={generalBtnText} 
                      onChange={(e) => setGeneralBtnText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">درصد پیشرفت هیرو:</label>
                    <input 
                      type="text" 
                      value={generalProgress} 
                      onChange={(e) => setGeneralProgress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Social Messengers & Contact */}
                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <h5 className="font-extrabold text-slate-200 text-xs flex items-center gap-1">
                    <Phone size={14} className="text-cyan-400" />
                    <span>پیام‌رسان‌های ایرانی و اطلاعات تماس:</span>
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold block">پیوند بله:</label>
                      <input 
                        type="text" 
                        value={baleLink} 
                        onChange={(e) => setBaleLink(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] dir-ltr"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold block">پیوند ایتا:</label>
                      <input 
                        type="text" 
                        value={eitaaLink} 
                        onChange={(e) => setEitaaLink(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] dir-ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold block">تلفن پشتیبانی:</label>
                      <input 
                        type="text" 
                        value={generalPhone} 
                        onChange={(e) => setGeneralPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold block">ایمیل رسمی:</label>
                      <input 
                        type="text" 
                        value={generalEmail} 
                        onChange={(e) => setGeneralEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">آدرس حضوری ستاد مرکزی:</label>
                    <input 
                      type="text" 
                      value={generalAddress} 
                      onChange={(e) => setGeneralAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block">متن معرفی درباره ما (صفحه اصلی و درباره ما):</label>
                  <textarea 
                    rows={4}
                    value={generalAboutText} 
                    onChange={(e) => setGeneralAboutText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Stats & FAQs & Home Announcements */}
            <div className="space-y-6">
              
              {/* Stats Block */}
              <div className="bg-[#080d21] border border-slate-800 p-4 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Award className="text-amber-400" size={16} />
                  <h4 className="font-extrabold text-slate-200">آمار زنده صفحه اصلی</h4>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">مأموریت‌ها:</label>
                    <input 
                      type="number" 
                      value={statMissions} 
                      onChange={(e) => setStatMissions(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">رزمندگان:</label>
                    <input 
                      type="number" 
                      value={statParticipants} 
                      onChange={(e) => setStatParticipants(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold block">جوخه‌ها:</label>
                    <input 
                      type="number" 
                      value={statGroups} 
                      onChange={(e) => setStatGroups(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setHomeStats({
                      activeMissions: statMissions,
                      activeParticipants: statParticipants,
                      activeGroups: statGroups
                    });
                    triggerAlert('آمار صفحه اصلی با موفقیت به‌روزرسانی شد.');
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>بروزرسانی شمارنده‌های آمار</span>
                </button>
              </div>

              {/* FAQ Accordion Block */}
              <div className="bg-[#080d21] border border-slate-800 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="text-rose-400" size={16} />
                    <h4 className="font-extrabold text-slate-200">پرسش‌ها و پاسخ‌های متداول</h4>
                  </div>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-bold">{faqs.length} سوال</span>
                </div>

                {/* FAQ Add Form */}
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      value={faqQ} 
                      onChange={(e) => setFaqQ(e.target.value)}
                      placeholder="عنوان سوال جدید را بنویسید..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <textarea 
                      rows={2}
                      value={faqA} 
                      onChange={(e) => setFaqA(e.target.value)}
                      placeholder="پاسخ کامل سوال را بنویسید..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!faqQ.trim() || !faqA.trim()) return;
                      const newFaqItem = {
                        id: `faq-${Date.now()}`,
                        question: faqQ.trim(),
                        answer: faqA.trim()
                      };
                      setFaqs(prev => [...prev, newFaqItem]);
                      setFaqQ('');
                      setFaqA('');
                      triggerAlert('سوال متداول جدید اضافه شد.');
                    }}
                    className="w-full py-1.5 text-white font-bold rounded-lg text-[11px] transition flex items-center justify-center gap-1 bg-red-900/60 hover:bg-red-800 border border-red-800"
                  >
                    <Plus size={14} />
                    <span>درج سوال جدید در لیست</span>
                  </button>
                </div>

                {/* FAQ List */}
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {faqs.map(item => (
                    <div key={item.id} className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-900 flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-extrabold text-white text-[11px]">؟ {item.question}</p>
                        <p className="text-slate-400 text-[10px] leading-relaxed">{item.answer}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setFaqs(prev => prev.filter(x => x.id !== item.id));
                          triggerAlert('سوال متداول با موفقیت حذف گردید.');
                        }}
                        className="p-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg transition shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Home Announcements block */}
              <div className="bg-[#080d21] border border-slate-800 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Megaphone className="text-emerald-400" size={16} />
                    <h4 className="font-extrabold text-slate-200">اطلاعیه‌های صفحه اصلی سایت</h4>
                  </div>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-bold">{homeAnnouncements.length} اطلاعیه</span>
                </div>

                {/* Announcement Add Form */}
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={annTitle} 
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="عنوان اطلاعیه..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input 
                      type="text" 
                      value={annImg} 
                      onChange={(e) => setAnnImg(e.target.value)}
                      placeholder="لینک عکس اطلاعیه..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white text-[10px]"
                    />
                  </div>
                  <textarea 
                    rows={2}
                    value={annMsg} 
                    onChange={(e) => setAnnMsg(e.target.value)}
                    placeholder="متن کامل اطلاعیه..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    onClick={() => {
                      if (!annTitle.trim() || !annMsg.trim()) return;
                      const newAnn = {
                        id: `ann-${Date.now()}`,
                        title: annTitle.trim(),
                        message: annMsg.trim(),
                        imageUrl: annImg.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
                        createdAt: '۱۴۰۳/۰۲/۲۲',
                        isActive: true
                      };
                      setHomeAnnouncements(prev => [newAnn, ...prev]);
                      setAnnTitle('');
                      setAnnMsg('');
                      setAnnImg('');
                      triggerAlert('اطلاعیه جدید قرارگاه با موفقیت منتشر گردید.');
                    }}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition flex items-center justify-center gap-1 border border-emerald-500"
                  >
                    <Plus size={14} />
                    <span>انتشار اطلاعیه جدید قرارگاه</span>
                  </button>
                </div>

                {/* Announcement List */}
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {homeAnnouncements.map(ann => (
                    <div key={ann.id} className="p-2 bg-slate-950/80 rounded-xl border border-slate-900 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {ann.imageUrl && (
                          <img src={ann.imageUrl} className="w-9 h-9 object-cover rounded-lg border border-slate-800" alt="" referrerPolicy="no-referrer" />
                        )}
                        <div>
                          <p className="font-extrabold text-white text-[11px]">{ann.title}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{ann.createdAt}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setHomeAnnouncements(prev => prev.filter(x => x.id !== ann.id));
                          triggerAlert('اطلاعیه قرارگاه با موفقیت حذف شد.');
                        }}
                        className="p-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 9. REAL-TIME PUSH NOTIFICATIONS & BROADCAST STUDIO */}
      {activeAdminTab === 'chat_control' && (
        <AdminChatRoomsPanel
          currentUser={currentUser}
          groups={groups}
          setGroups={setGroups}
          users={users}
          setUsers={setUsers}
          triggerAlert={triggerAlert}
        />
      )}

      {activeAdminTab === 'notifications' && (
        <div className="space-y-6">
          {/* Studio Header Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/70 via-slate-900 to-amber-950/60 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                <Bell size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-white">مرکز فرماندهی پخش پیام و نوتیفیکیشن زنده</h3>
                  <span className="bg-emerald-950 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    سیستم پخش برخط فعال
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  ارسال مستقیم پیام‌ها و اخطارهای تاکتیکی به کاربران آنلاین و ثبت دائم در مرکز اعلانات داشبورد
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playNotificationSound(notifType);
                  triggerAlert('صدای هشدار تاکتیکی آزمایش شد.');
                }}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="تست صدای آلارم"
              >
                <Volume2 size={15} />
                <span>تست صدای هشدار</span>
              </button>
            </div>
          </div>

          {/* Quick Tactical Presets */}
          <div className="p-4 rounded-2xl bg-[#080d21] border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <Sparkles size={14} />
                قالب‌های آماده و دستورالعمل‌های سریع عملیاتی (تک‌کلیک برای پر کردن فرم):
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset(
                  'دستور آماده‌باش عملیاتی: آغاز مأموریت ۳ دفاع هوایی',
                  'رزمندگان غیور اتاق جنگ، سناریوی جدید مقابله با جنگ الکترونیک و پدافند سایبری فعال گردید. پاسخ‌ها را سریعاً ارسال نمایید.',
                  'urgent',
                  'Missions',
                  'مشاهده سناریوی مأموریت',
                  'all'
                )}
                className="p-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 hover:border-rose-500 text-rose-200 rounded-xl text-right transition space-y-1 group"
              >
                <div className="flex items-center justify-between text-[11px] font-black text-rose-300">
                  <span>🚨 مأموریت فوری</span>
                  <Radio size={12} className="group-hover:animate-ping" />
                </div>
                <p className="text-[10px] text-rose-200/70 line-clamp-1">اعلام آماده‌باش عملیات دفاع هوایی</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(
                  'ارزیابی و امتیازدهی مرحله جدید انجام شد',
                  'پاسخ‌های ثبت‌شده توسط هیئت داوران ستاد بررسی و نمره‌گذاری شد. جهت مشاهده رتبه و امتیازات خود به جدول جوایز مراجعه کنید.',
                  'score',
                  'Rewards',
                  'مشاهده رتبه‌بندی و جوایز',
                  'all'
                )}
                className="p-2.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 hover:border-emerald-500 text-emerald-200 rounded-xl text-right transition space-y-1 group"
              >
                <div className="flex items-center justify-between text-[11px] font-black text-emerald-300">
                  <span>⚡ ثبت نمرات و نتایج</span>
                  <Zap size={12} />
                </div>
                <p className="text-[10px] text-emerald-200/70 line-clamp-1">اعلام ثبت امتیازات و ارزیابی داوران</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(
                  'اهدای نشان و مدال شجاعت به رزمندگان ممتاز',
                  'ستاد کل فرماندهی نشان‌های ویژه شجاعت و نخبه کوانتوم را به برترین‌های مسابقه اهدا نمود.',
                  'medal',
                  'Dashboard',
                  'مشاهده نشان‌ها در کارنامه',
                  'all'
                )}
                className="p-2.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 hover:border-amber-500 text-amber-200 rounded-xl text-right transition space-y-1 group"
              >
                <div className="flex items-center justify-between text-[11px] font-black text-amber-300">
                  <span>🎖️ اهدای نشان افتخار</span>
                  <Award size={12} />
                </div>
                <p className="text-[10px] text-amber-200/70 line-clamp-1">اطلاع‌رسانی مدال‌های کسب شده</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(
                  'جلسه برخط هماهنگی و تقسیم کار فرماندهان جوخه',
                  'فرماندهان محترم موظفند لیست اعضای جوخه و وضعیت پاسخ‌دهی را پیش از اتمام مهلت بررسی فرمایند.',
                  'squad',
                  'Journey',
                  'ورود به نقشه مراحل',
                  'leaders'
                )}
                className="p-2.5 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 hover:border-indigo-500 text-indigo-200 rounded-xl text-right transition space-y-1 group"
              >
                <div className="flex items-center justify-between text-[11px] font-black text-indigo-300">
                  <span>🛡️ ویژه فرماندهان</span>
                  <Users size={12} />
                </div>
                <p className="text-[10px] text-indigo-200/70 line-clamp-1">دستور به سرگروه‌ها و فرماندهان</p>
              </button>
            </div>
          </div>

          {/* Broadcast Form & Live Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Column (7 cols) */}
            <div className="lg:col-span-7 bg-[#080d21] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Send className="text-amber-400" size={16} />
                  تنظیم و ارسال نوتیفیکیشن زنده
                </h4>
                <span className="text-[11px] text-slate-400">تمام ورودی‌ها دارای اعتبارسنجی بلادرنگ هستند</span>
              </div>

              <form onSubmit={handleBroadcastNotification} className="space-y-4">
                
                {/* Notification Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    عنوان پیام یا اخطار عملیاتی <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: دستور آماده‌باش عملیاتی شماره ۳"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    متن پیام و توضیحات تکمیلی <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="متن کامل پیام که بلافاصله روی صفحه کاربر به نمایش درمی‌آید..."
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none transition leading-relaxed resize-none"
                  />
                </div>

                {/* Type & Urgency Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">نوع و ماهیت پیام</label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value as NotificationType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="urgent">🚨 فوری و آماده‌باش</option>
                      <option value="mission">🎯 مأموریت جدید</option>
                      <option value="score">⚡ امتیاز و ارزیابی</option>
                      <option value="medal">🎖️ نشان و مدال افتخار</option>
                      <option value="squad">🛡️ اطلاعیه جوخه</option>
                      <option value="announcement">📢 پیام عمومی ستاد</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">جامعه هدف (مخاطبان)</label>
                    <select
                      value={notifTarget}
                      onChange={(e) => setNotifTarget(e.target.value as NotificationTarget)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="all">🌐 همه رزمندگان سامانه</option>
                      <option value="leaders">⭐ فقط فرماندهان جوخه‌ها</option>
                      <option value="girls">👩 فقط دانش‌آموزان دختر</option>
                      <option value="boys">👦 فقط دانش‌آموزان پسر</option>
                      <option value="specific_user">👤 رزمنده خاص (با کد ۹ رقمی)</option>
                      <option value="specific_squad">🛡️ جوخه خاص</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">ارجاع به بخش (اقدام مستقیم)</label>
                    <select
                      value={notifActionTab}
                      onChange={(e) => {
                        setNotifActionTab(e.target.value);
                        if (e.target.value === 'Missions') setNotifActionLabel('مشاهده مأموریت‌ها');
                        else if (e.target.value === 'Journey') setNotifActionLabel('ورود به نقشه مراحل');
                        else if (e.target.value === 'Rewards') setNotifActionLabel('مشاهده جدول امتیازات');
                        else if (e.target.value === 'Vitrin') setNotifActionLabel('ویترین آثار');
                        else if (e.target.value === 'Support') setNotifActionLabel('بخش تیکت و پشتیبانی');
                        else if (e.target.value === 'Dashboard') setNotifActionLabel('داشبورد شخصی');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="">بدون دکمه ارجاع</option>
                      <option value="Missions">مأموریت‌ها</option>
                      <option value="Journey">نقشه مراحل</option>
                      <option value="Rewards">جوایز و امتیازات</option>
                      <option value="Vitrin">ویترین آثار دانش‌آموزی</option>
                      <option value="Support">تیکت‌ها و پشتیبانی</option>
                      <option value="Dashboard">داشبورد و کارنامه</option>
                    </select>
                  </div>
                </div>

                {/* Specific User / Squad Selector if chosen */}
                {notifTarget === 'specific_user' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                    <label className="block text-[11px] font-bold text-amber-300">انتخاب کاربر گیرنده پیام:</label>
                    <select
                      value={notifTargetUserId}
                      onChange={(e) => setNotifTargetUserId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">-- انتخاب کاربر از بین {users.length} کاربر ثبت‌نامی --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} (کد: {u.personal_code}) - {u.role === 'leader' ? 'فرمانده' : 'عضو'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {notifTarget === 'specific_squad' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                    <label className="block text-[11px] font-bold text-amber-300">انتخاب جوخه هدف:</label>
                    <select
                      value={notifTargetGroupId}
                      onChange={(e) => setNotifTargetGroupId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">-- انتخاب جوخه --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          جوخه {g.name} (کد: {g.registration_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Additional Settings: Action button label & Sender Signature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {notifActionTab && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">عنوان دکمه اقدام</label>
                      <input
                        type="text"
                        placeholder="مثال: مشاهده مأموریت"
                        value={notifActionLabel}
                        onChange={(e) => setNotifActionLabel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">امضای فرستنده پیام</label>
                    <input
                      type="text"
                      placeholder="ستاد کل فرماندهی اتاق جنگ"
                      value={notifSenderName}
                      onChange={(e) => setNotifSenderName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 hover:opacity-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Radio size={17} className="animate-pulse" />
                    <span>ارسال بلادرنگ نوتیفیکیشن به کاربران آنلاین</span>
                  </button>
                </div>

                {previewTestSent && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
                    <CheckCircle2 size={16} />
                    <span>نوتیفیکیشن هم‌اکنون با موفقیت ارسال شد و در صفحه تست نیز پاپ‌آپ گردید!</span>
                  </div>
                )}

              </form>
            </div>

            {/* Live Preview & Stats Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Live Preview Box */}
              <div className="bg-[#080d21] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    پیش‌نمایش زنده در صفحه کاربر (Live UI Preview)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">طرح پاپ‌آپ شناور</span>
                </div>

                <div className="p-3 bg-slate-950/90 rounded-2xl border border-cyan-500/30 space-y-2 relative overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      <span className="font-black text-white font-mono">
                        {notifType === 'urgent' && '🚨 اخطار فوری'}
                        {notifType === 'mission' && '🎯 مأموریت جدید'}
                        {notifType === 'score' && '⚡ امتیاز و ارزیابی'}
                        {notifType === 'medal' && '🎖️ نشان و مدال'}
                        {notifType === 'squad' && '🛡️ اطلاعیه جوخه'}
                        {notifType === 'announcement' && '📢 پیام ستاد'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">هم‌اکنون</span>
                  </div>

                  <div>
                    <h5 className="text-xs font-black text-white">
                      {notifTitle || 'عنوان نوتیفیکیشن در این قسمت قرار می‌گیرد'}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {notifMessage || 'متن کامل پیام و اخطار عملیاتی ارسالی توسط ادمین در این کادر شناور روی گوشی یا دسکتاپ رزمنده نشان داده می‌شود...'}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-400 font-bold">
                      از: {notifSenderName || 'ستاد کل فرماندهی'}
                    </span>
                    {notifActionTab && (
                      <span className="text-[10px] bg-cyan-500 text-slate-950 font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <span>{notifActionLabel || 'مشاهده'}</span>
                        <ExternalLink size={10} />
                      </span>
                    )}
                  </div>

                  <div className="h-0.5 bg-gradient-to-r from-red-500 via-amber-400 to-cyan-400 absolute bottom-0 inset-x-0" />
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  کاربر با کلیک روی پیام به بخش مربوطه هدایت شده یا پیام در زنگوله اعلان‌ها ذخیره می‌گردد.
                </p>
              </div>

              {/* Sent Notifications History */}
              <div className="bg-[#080d21] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-400" />
                    تاریخچه پیام‌های ارسالی ({formatToPersianDigits(notifications.length)})
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">هنوز هیچ نوتیفیکیشنی ارسال نشده است.</p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 hover:border-slate-700 transition space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono">
                              {notif.type}
                            </span>
                            <h6 className="text-xs font-bold text-white truncate">{notif.title}</h6>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNotifications(prev => prev.filter(x => x.id !== notif.id));
                              triggerAlert('پیام از تاریخچه حذف گردید.');
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 transition"
                            title="حذف پیام"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{notif.message}</p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                          <span>مخاطب: {notif.target}</span>
                          <span>{notif.created_at}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 11. SOUNDTRACKS & AUDIO RADIO MANAGER TAB */}
      {activeAdminTab === 'soundtracks' && (
        <AdminSoundtrackManager triggerAlert={triggerAlert} />
      )}

      {/* 12. GAME PORTALS & LINKING MANAGER TAB */}
      {activeAdminTab === 'portals' && (
        <div className="space-y-6 dir-rtl font-sans">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#091e2b] via-[#05131d] to-[#01060c] border border-emerald-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <Gamepad2 size={15} className="animate-pulse text-emerald-400" />
                <span>مدیریت سامانه‌ها و لینک‌دهی درگاه‌های بازی</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                تعریف، ویرایش و اتصال لینک درگاه‌های مسابقه
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                در این بخش می‌توانید درگاه‌های مختلف بازی و رویداد را تعریف، لینک‌های مستقیم یا بیرونی را تنظیم کرده و وضعیت فعال‌سازی یا به‌زودی هر سامانه را مدیریت نمایید.
              </p>
            </div>

            <button
              onClick={handleOpenCreatePortal}
              className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-[0_0_25px_rgba(16,185,129,0.5)] transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus size={18} />
              <span>افزودن درگاه جدید</span>
            </button>
          </div>

          {/* Portals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {portals.map((portal) => {
              const isActive = portal.status === 'active';
              return (
                <div
                  key={portal.id}
                  className={`bg-[#080d21] border rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                      : 'border-slate-800 opacity-85'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-2xl p-2 flex items-center justify-center border ${
                          isActive
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}>
                          <Gamepad2 size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">{portal.title}</h3>
                          <p className="text-[11px] text-amber-300 font-medium">{portal.subtitle}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : portal.status === 'coming_soon'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      }`}>
                        {portal.badgeText || (isActive ? 'فعال' : 'به‌زودی')}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 leading-relaxed min-h-[40px]">
                      {portal.description}
                    </p>

                    {/* Link Box */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-1.5 dir-ltr">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono dir-rtl">
                        <span className="flex items-center gap-1 font-bold">
                          <LinkIcon size={12} className="text-emerald-400" />
                          لینک اختصاصی درگاه:
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                          {portal.targetAudience === 'girls' ? 'دختران' : portal.targetAudience === 'boys' ? 'پسران' : 'عمومی'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <code className="text-xs font-mono text-cyan-300 truncate font-semibold">
                          {portal.link || '/journey'}
                        </code>
                        <button
                          onClick={() => {
                            if (portal.link) {
                              navigator.clipboard.writeText(portal.link);
                              triggerAlert('لینک درگاه در حافظه کپی شد.');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="کپی لینک"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePortalStatus(portal.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                          isActive
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                        }`}
                        title="تغییر سریع وضعیت"
                      >
                        <RefreshCw size={12} />
                        <span>{isActive ? 'تغییر به به‌زودی' : 'فعال‌سازی'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditPortal(portal)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 hover:text-white transition cursor-pointer"
                        title="ویرایش و لینک‌دهی"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        onClick={() => handleDeletePortal(portal.id, portal.title)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="حذف درگاه"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {portal.link && (
                      <a
                        href={portal.link}
                        target={portal.link.startsWith('http') ? '_blank' : '_self'}
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <span>تست</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Create / Edit Portal Modal */}
          {showPortalModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
              <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setShowPortalModal(false)}
              />

              <div className="relative w-full max-w-xl bg-[#081026] border border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Gamepad2 size={20} className="text-emerald-400" />
                    <h3 className="text-lg font-black text-white">
                      {editingPortal ? `ویرایش درگاه «${editingPortal.title}»` : 'ایجاد درگاه جدید بازی'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowPortalModal(false)}
                    className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <form onSubmit={handleSavePortalSubmit} className="space-y-4">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      عنوان درگاه (سامانه) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثلاً: عملیات کهکشان، نبرد سایبری، اتاق جنگ"
                      value={portalForm.title}
                      onChange={(e) => setPortalForm({ ...portalForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      زیرعنوان / تیتر کوتاه
                    </label>
                    <input
                      type="text"
                      placeholder="مثلاً: شبیه‌ساز فرماندهی ناوگان فضایی"
                      value={portalForm.subtitle}
                      onChange={(e) => setPortalForm({ ...portalForm, subtitle: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      آدرس لینک مستقیم (URL / مسیر هدایت) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثلاً: https://galaxy.warroom.ir یا /journey"
                      value={portalForm.link}
                      onChange={(e) => setPortalForm({ ...portalForm, link: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono dir-ltr"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      اگر لینک با http شروع شود کاربر به سایت خارجی هدایت می‌شود، در غیر این‌صورت وارد بخش داخلی برنامه می‌گردد.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">وضعیت فعال‌سازی</label>
                      <select
                        value={portalForm.status}
                        onChange={(e: any) => setPortalForm({ ...portalForm, status: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="active">فعال • در حال برگزاری</option>
                        <option value="coming_soon">به‌زودی • فصل جدید</option>
                        <option value="disabled">غیرفعال</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">مخاطبان هدف</label>
                      <select
                        value={portalForm.targetAudience}
                        onChange={(e: any) => setPortalForm({ ...portalForm, targetAudience: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="all">عمومی (دختران و پسران)</option>
                        <option value="girls">اختصاصی دختران</option>
                        <option value="boys">اختصاصی پسران</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">متن نشان یا وضعیت</label>
                      <input
                        type="text"
                        placeholder="مثلاً: فعال • فصل ۱"
                        value={portalForm.badgeText}
                        onChange={(e) => setPortalForm({ ...portalForm, badgeText: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">برچسب درگاه</label>
                      <input
                        type="text"
                        placeholder="مثلاً: مسابقه اصلی"
                        value={portalForm.tag}
                        onChange={(e) => setPortalForm({ ...portalForm, tag: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">توضیحات درگاه</label>
                    <textarea
                      rows={3}
                      placeholder="توضیحات مختصر درگاه برای نمایش به کاربران..."
                      value={portalForm.description}
                      onChange={(e) => setPortalForm({ ...portalForm, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPortalModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800"
                    >
                      انصراف
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Check size={16} />
                      <span>{editingPortal ? 'ذخیره تغییرات' : 'ایجاد درگاه'}</span>
                    </button>
                  </div>

                </form>

              </div>
            </div>
          )}

        </div>
      )}

      {/* Elementor Full-Page Visual Builder Modal */}
      <ElementorVisualEditorModal
        isOpen={isElementorOpen}
        onClose={() => setIsElementorOpen(false)}
        siteSettings={{
          siteName: cmsSiteName,
          siteTagline: cmsSiteTagline,
          badgeText: cmsBadgeText,
          heroTitle: generalTitle,
          heroProgress: generalProgress,
          heroCountdown: generalCountdown,
          heroImage: generalImage,
          heroVideoUrl: heroVideoUrl,
          teaserVideoUrl: teaserVideoUrl,
          girlsBannerImage: girlsBannerImage,
          boysBannerImage: boysBannerImage,
          heroButtonText: generalBtnText,
          contactPhone: generalPhone,
          contactEmail: generalEmail,
          telegram: generalTelegram,
          baleLink: baleLink,
          eitaaLink: eitaaLink,
          address: generalAddress,
          aboutText: generalAboutText,
          prizeTitle: prizeTitle,
          prizeDescription: prizeDescription,
          homeButtons: homeButtons,
          homeBlocks: siteSettings?.homeBlocks
        }}
        onSaveSiteSettings={(updated) => {
          setSiteSettings(updated);
          if (updated.homeButtons) setHomeButtons(updated.homeButtons);
          triggerAlert('چیدمان و اطلاعات جدید صفحه اصلی با موفقیت ذخیره و منتشر شد!');
        }}
        homeAnnouncements={homeAnnouncements || []}
        homeStats={homeStats || { activeMissions: 12, activeParticipants: 1450, completedMissions: 3200, totalCrystalsAwarded: 58000 }}
        faqs={faqs || []}
        currentUser={currentUser}
      />

      {/* ==================================================================== */}
      {/* 13. 🎖️ VITRIN (SHOWCASE) MANAGER TAB — ویترین آثار                     */}
      {/* ==================================================================== */}
      {activeAdminTab === 'vitrins' && (
        <div className="space-y-6 dir-rtl font-sans">

          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1c0511] via-[#0f0310] to-[#050109] border border-rose-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="absolute -left-10 -top-10 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
                  <Gem size={15} className="animate-pulse text-rose-400" />
                  <span>ویترین آثار — نمایشگاه عمومی رزمندگان</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">مدیریت و ایجاد ویترین‌های آثار</h2>
              </div>
              <button
                onClick={handleOpenCreateVitrin}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-400 text-slate-950 text-sm font-black shadow-[0_0_25px_rgba(244,63,94,0.5)] hover:brightness-110 transition shrink-0"
              >
                <Plus size={18} />
                <span>ایجاد ویترین جدید</span>
              </button>
            </div>
          </div>

          {/* Supabase Sync Status Chip */}
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold ${
            isSupabaseEnabled
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSupabaseEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>
              {isSupabaseEnabled
                ? 'ویترین به Supabase متصل است — ذخیره‌سازی ابری فعال (جدول warroom_vitrin_posts)'
                : 'وضعیت: حالت محلی (Supabase پیکربندی نشده) — ذخیره در localStorage'}
            </span>
          </div>

          {/* Vitrin Posts Grid */}
          {vitrinPosts.length === 0 ? (
            <div className="p-12 rounded-3xl border-2 border-dashed border-slate-700/60 bg-slate-950/40 text-center space-y-3">
              <Gem size={40} className="mx-auto text-rose-400/60" />
              <p className="text-sm font-black text-white">هنوز اثری در ویترین ثبت نشده است</p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                برای شروع، روی «ایجاد ویترین جدید» کلیک کنید یا از بخش «داوری و امتیازدهی»،
                اثر ارسالی یک رزمنده را تأیید و در ویترین منتشر نمایید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vitrinPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="group bg-[#080d1a] border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-rose-500/40 transition relative"
                >
                  {/* Media */}
                  <div className="relative aspect-[4/3] bg-black overflow-hidden">
                    <img
                      src={post.mediaUrl}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    {post.mediaType === 'video' && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        <Video size={11} />
                        <span>ویدیو</span>
                      </span>
                    )}
                    {post.badge && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                        {post.badge}
                      </span>
                    )}
                    {/* Reorder Buttons */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleMoveVitrinPost(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg bg-black/70 border border-slate-600 text-slate-200 hover:text-white disabled:opacity-30 hover:disabled:opacity-30"
                        title="جابه‌جایی به بالا"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => handleMoveVitrinPost(index, 1)}
                        disabled={index === vitrinPosts.length - 1}
                        className="p-1.5 rounded-lg bg-black/70 border border-slate-600 text-slate-200 hover:text-white disabled:opacity-30"
                        title="جابه‌جایی به پایین"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <img src={post.authorAvatar} alt={post.authorName} className="w-7 h-7 rounded-full object-cover border border-rose-500/40" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white truncate">{post.authorName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{post.squadName}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/30 shrink-0">
                        {post.stageTag}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">{post.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{post.description}</p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1"><Heart size={11} className="text-rose-400" /> {formatToPersianDigits(post.likesCount)}</span>
                      <span className="flex items-center gap-1"><Star size={11} className="text-amber-400" /> {formatToPersianDigits(post.ratingAverage)}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={11} className="text-cyan-400" /> {formatToPersianDigits(post.commentsCount)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleOpenEditVitrin(post)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold hover:bg-cyan-900/60 transition"
                      >
                        <Edit3 size={13} />
                        <span>ویرایش</span>
                      </button>
                      <button
                        onClick={() => handleDeleteVitrinPost(post)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-bold hover:bg-rose-900/60 transition"
                      >
                        <Trash2 size={13} />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 13b. 🎖️ VITRIN CREATE/EDIT MODAL */}
      {showVitrinModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
          <div className="bg-[#090e21] border border-rose-500/40 rounded-3xl max-w-2xl w-full overflow-hidden text-white shadow-2xl relative flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-950 text-rose-400 border border-rose-500/40">
                  <Gem size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">{editingVitrinPost ? 'ویرایش اثر ویترین' : 'ایجاد ویترین جدید'}</h3>
                  <span className="text-[10px] text-rose-300 font-mono">📡 ذخیره ابری در پایگاه داده</span>
                </div>
              </div>
              <button onClick={() => setShowVitrinModal(false)} className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form id="vitrin-form" onSubmit={handleSaveVitrinPost} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">عنوان اثر *</label>
                  <input
                    type="text"
                    value={vitrinForm.title}
                    onChange={e => setVitrinForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="مثلاً: طرح استراتژیک عملیات فنی و مهندسی"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">توضیحات اثر</label>
                  <textarea
                    value={vitrinForm.description}
                    onChange={e => setVitrinForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="توضیح مختصر درباره این اثر..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">نام سازنده / رزمنده</label>
                  <input
                    type="text"
                    value={vitrinForm.authorName}
                    onChange={e => setVitrinForm(prev => ({ ...prev, authorName: e.target.value }))}
                    placeholder="مثلاً: سارا احمدی"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">نام جوخه / تیم</label>
                  <input
                    type="text"
                    value={vitrinForm.squadName}
                    onChange={e => setVitrinForm(prev => ({ ...prev, squadName: e.target.value }))}
                    placeholder="مثلاً: جوخه صاعقه"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">نوع رسانه</label>
                  <select
                    value={vitrinForm.mediaType}
                    onChange={e => setVitrinForm(prev => ({ ...prev, mediaType: e.target.value as 'image' | 'video' }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                  >
                    <option value="image">تصویر</option>
                    <option value="video">ویدیو</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">برچسب مرحله / بخش</label>
                  <input
                    type="text"
                    value={vitrinForm.stageTag}
                    onChange={e => setVitrinForm(prev => ({ ...prev, stageTag: e.target.value }))}
                    placeholder="مثلاً: مأموریت ۳"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">رسانه {vitrinForm.mediaType === 'video' ? 'ویدیو' : 'تصویر'} (آپلود یا لینک) *</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        ref={vitrinMediaInputRef}
                        type="file"
                        accept={vitrinForm.mediaType === 'video' ? 'video/*' : 'image/*'}
                        onChange={handleVitrinMediaUpload}
                        disabled={vitrinMediaUploading}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => vitrinMediaInputRef.current?.click()}
                        disabled={vitrinMediaUploading || !isSupabaseEnabled}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-bold hover:border-rose-400 hover:text-white disabled:opacity-40 transition shrink-0"
                        title={isSupabaseEnabled ? 'آپلود به Supabase Storage' : 'آپلود نیازمند اتصال Supabase است'}
                      >
                        {vitrinMediaUploading ? <Loader2 size={13} className="animate-spin text-rose-400" /> : <Upload size={13} />}
                        <span>{vitrinMediaUploading ? 'در حال آپلود...' : 'آپلود فایل'}</span>
                      </button>
                      <input
                        type="text"
                        value={vitrinForm.mediaType === 'video' ? vitrinForm.videoSourceUrl : vitrinForm.mediaUrl}
                        onChange={e => setVitrinForm(prev => prev.mediaType === 'video'
                          ? { ...prev, videoSourceUrl: e.target.value, mediaUrl: e.target.value }
                          : { ...prev, mediaUrl: e.target.value })}
                        placeholder="یا لینک مستقیم رسانه (https://...)"
                        className="flex-1 bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                    </div>
                    {vitrinForm.mediaType === 'image' ? (
                      vitrinForm.mediaUrl ? (
                        <img src={vitrinForm.mediaUrl} alt="پیش‌نمایش" className="w-24 h-24 object-cover rounded-xl border border-slate-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1"><Image size={11} /> پس از بارگذاری یا وارد کردن پیوند، پیش‌نمایش نمایش داده می‌شود.</p>
                      )
                    ) : (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><Video size={11} /> نشانی اینترنتی ویدیو برای پخش در ویترین استفاده می‌شود.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">لینک آواتار سازنده</label>
                  <input
                    type="text"
                    value={vitrinForm.authorAvatar}
                    onChange={e => setVitrinForm(prev => ({ ...prev, authorAvatar: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">برچسب افتخارات (اختیاری)</label>
                  <input
                    type="text"
                    value={vitrinForm.badge}
                    onChange={e => setVitrinForm(prev => ({ ...prev, badge: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                    placeholder="مثلاً: تأیید شده داوران ستاد"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">تعداد لایک اولیه</label>
                  <input
                    type="number"
                    min={0}
                    value={vitrinForm.likesCount}
                    onChange={e => setVitrinForm(prev => ({ ...prev, likesCount: Number(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">میانگین امتیاز (۱ تا ۵)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={vitrinForm.ratingAverage}
                    onChange={e => setVitrinForm(prev => ({ ...prev, ratingAverage: Number(e.target.value) || 5 }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
              <button
                onClick={() => setShowVitrinModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:text-white transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById('vitrin-form') as HTMLFormElement | null;
                  if (form) form.requestSubmit();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white text-xs font-black shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:brightness-110 transition"
              >
                <Check size={14} />
                <span>{editingVitrinPost ? 'ذخیره تغییرات' : 'ایجاد ویترین'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 14. 🗺️ STAGE & PATH BUILDER TAB (مدیریت مراحل نقشه و چالش روزانه)       */}
      {/* ==================================================================== */}
      {activeAdminTab === 'stage_builder' && (
        <div className="space-y-6 dir-rtl font-sans">

          {/* Section 1: Daily Challenge Configuration */}
          <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">مدیریت چالش تاکتیکی روزانه</h3>
                  <p className="text-[11px] text-slate-400">تنظیم سوال و پاداش امتیاز چالش روزانه رزمندگان</p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                dailyForm.isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {dailyForm.isActive ? 'چالش فعال است' : 'چالش غیرفعال'}
              </span>
            </div>

            <form onSubmit={handleSaveDailyChallenge} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">عنوان چالش</label>
                  <input
                    type="text"
                    value={dailyForm.title}
                    onChange={e => setDailyForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    placeholder="چالش تاکتیکی روزانه"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">پاداش امتیاز (Points)</label>
                  <input
                    type="number"
                    value={dailyForm.pointsReward}
                    onChange={e => setDailyForm(prev => ({ ...prev, pointsReward: Number(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">مهلت تایمر پاسخگویی (۵ تا ۶۰۰ ثانیه)</label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={dailyForm.timeLimitSeconds || 10}
                    onChange={e => {
                      const val = Math.max(5, Math.min(600, Number(e.target.value) || 5));
                      setDailyForm(prev => ({ ...prev, timeLimitSeconds: val }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono outline-none"
                    placeholder="10"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">توضیحات مختصر</label>
                  <input
                    type="text"
                    value={dailyForm.description}
                    onChange={e => setDailyForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">متن سوال چالش روزانه *</label>
                  <input
                    type="text"
                    value={dailyForm.questionText}
                    onChange={e => setDailyForm(prev => ({ ...prev, questionText: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    placeholder="متن سوال را وارد نمایید..."
                  />
                </div>

                {dailyForm.options.map((opt, optIdx) => (
                  <div key={optIdx}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400">گزینه {optIdx + 1}</label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="correct_option"
                          checked={dailyForm.correctOptionIndex === optIdx}
                          onChange={() => setDailyForm(prev => ({ ...prev, correctOptionIndex: optIdx }))}
                          className="accent-amber-400"
                        />
                        <span className="text-[10px] text-amber-300">پاسخ صحیح</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const newOpts = [...dailyForm.options];
                        newOpts[optIdx] = e.target.value;
                        setDailyForm(prev => ({ ...prev, options: newOpts }));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg flex items-center gap-2"
                >
                  <Check size={14} />
                  <span>ذخیره چالش روزانه</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Stages Management List */}
          <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <MapPin size={16} className="text-cyan-400" />
                  <span>لیست مراحل نقشه بازی ({stages.length} مرحله)</span>
                </h3>
                <p className="text-[11px] text-slate-400">مراحل و مسیر تاکتیکی به صورت پویا از پایگاه داده پشتیبانی می‌شوند</p>
              </div>

              <button
                onClick={handleOpenAddStage}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>افزودن مرحله جدید</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stages.length === 0 ? (
                <div className="col-span-full p-8 rounded-3xl bg-slate-950/60 border border-dashed border-cyan-500/30 flex flex-col items-center justify-center text-center space-y-3">
                  <span className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                    <MapPin size={28} />
                  </span>
                  <h4 className="text-sm font-black text-white">هنوز هیچ مرحله‌ای در مسیر بازی تعریف نشده است</h4>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    با کلیک روی دکمه زیر می‌توانید مرحله ۱ را ایجاد کرده و امتیاز و مشخصات آن را مشخص کنید.
                  </p>
                  <button
                    onClick={handleOpenAddStage}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-black text-xs transition shadow-lg flex items-center gap-2 cursor-pointer hover:opacity-95"
                    id="btn-add-first-stage"
                  >
                    <Plus size={16} />
                    <span>ایجاد و افزودن اولین مرحله بازی</span>
                  </button>
                </div>
              ) : stages.map((stg) => (
                <div
                  key={stg.id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/50 transition flex flex-col justify-between gap-3 group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shrink-0 overflow-hidden shadow">
                        {stg.customIconUrl ? (
                          <img src={stg.customIconUrl} alt={stg.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-cyan-400 font-black text-base">مـ{stg.number}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/20">
                            مرحله {stg.number}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            stg.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : stg.status === 'in_progress'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {stg.status === 'completed' ? 'تکمیل شده' : stg.status === 'in_progress' ? 'در حال انجام' : 'قفل'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white mt-1">{stg.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{stg.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    {stg.description || 'بدون توضیحات'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                    <div>
                      <span>امتیاز لازم: </span>
                      <strong className="text-amber-300 font-mono">{stg.requiredPoints}</strong>
                    </div>
                    <div>
                      <span>مأموریت‌ها: </span>
                      <strong className="text-cyan-300 font-mono">{stg.missionsCount}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEditStage(stg)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Edit3 size={13} />
                      <span>ویرایش</span>
                    </button>
                    <button
                      onClick={() => handleDeleteStage(stg)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: STAGE EDITOR MODAL (ویرایش و افزودن مرحله)                 */}
      {/* ==================================================================== */}
      {showStageModal && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl font-sans overflow-y-auto">
          <div className="bg-[#0b1329] border border-cyan-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
                  <MapPin size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">{editingStage ? `ویرایش مرحله «${editingStage.title}»` : 'ایجاد مرحله جدید'}</h3>
                  <p className="text-[10px] text-cyan-300">پیکربندی هوشمند و همگام با Supabase</p>
                </div>
              </div>
              <button onClick={() => setShowStageModal(false)} className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form id="stage-editor-form" onSubmit={handleSaveStage} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">شماره مرحله (Order) *</label>
                  <input
                    type="number"
                    value={stageForm.number}
                    onChange={e => setStageForm(prev => ({ ...prev, number: Number(e.target.value) || 1 }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">عنوان مرحله *</label>
                  <input
                    type="text"
                    value={stageForm.title}
                    onChange={e => setStageForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="مثلاً: معرفت و آمادگی"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">زیرعنوان مرحله</label>
                  <input
                    type="text"
                    value={stageForm.subtitle}
                    onChange={e => setStageForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="شناخت مبانی و تعالیم"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">امتیاز مورد نیاز (Required Points)</label>
                  <input
                    type="number"
                    value={stageForm.requiredPoints}
                    onChange={e => setStageForm(prev => ({ ...prev, requiredPoints: Number(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">تعداد مأموریت‌ها</label>
                  <input
                    type="number"
                    value={stageForm.missionsCount}
                    onChange={e => setStageForm(prev => ({ ...prev, missionsCount: Number(e.target.value) || 1 }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">وضعیت اولیه مرحله</label>
                  <select
                    value={stageForm.status}
                    onChange={e => setStageForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="completed">تکمیل شده (Completed)</option>
                    <option value="in_progress">در حال انجام (In Progress)</option>
                    <option value="locked">قفل شده (Locked)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-3 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <HelpCircle size={15} className="text-cyan-400" />
                        <span>سوالات آزمون مرحله (چهار گزینه‌ای)</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">طرح سوالات ۴ گزینه‌ای برای ارزیابی رزمندگان در این مرحله</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newQ: StageQuizQuestion = {
                          id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                          question: '',
                          options: ['', '', '', ''],
                          correctAnswer: 0
                        };
                        setStageForm(prev => ({ ...prev, quizQuestions: [...(prev.quizQuestions || []), newQ] }));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>افزودن سوال جدید</span>
                    </button>
                  </div>

                  {(!stageForm.quizQuestions || stageForm.quizQuestions.length === 0) ? (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                      هنوز هیچ سوالی برای این مرحله تعریف نشده است. با کلیک روی «افزودن سوال جدید» سوالات ۴ گزینه‌ای ایجاد کنید.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                      {stageForm.quizQuestions.map((q, qIdx) => (
                        <div key={q.id || qIdx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3 relative">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-cyan-300">سوال {qIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setStageForm(prev => ({
                                  ...prev,
                                  quizQuestions: prev.quizQuestions.filter((_, idx) => idx !== qIdx)
                                }));
                              }}
                              className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-950/40 transition cursor-pointer"
                              title="حذف این سوال"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">متن سوال *</label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={e => {
                                const updated = [...stageForm.quizQuestions];
                                updated[qIdx] = { ...updated[qIdx], question: e.target.value };
                                setStageForm(prev => ({ ...prev, quizQuestions: updated }));
                              }}
                              placeholder="سوال مرحله را وارد کنید..."
                              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-300 font-bold">مهلت پاسخگویی به این سوال (۵ تا ۶۰۰ ثانیه):</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={5}
                                max={600}
                                value={q.timeLimitSeconds || 30}
                                onChange={e => {
                                  const val = Math.max(5, Math.min(600, Number(e.target.value) || 5));
                                  const updated = [...stageForm.quizQuestions];
                                  updated[qIdx] = { ...updated[qIdx], timeLimitSeconds: val };
                                  setStageForm(prev => ({ ...prev, quizQuestions: updated }));
                                }}
                                className="w-20 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono outline-none text-center"
                              />
                              <span className="text-[10px] text-slate-400 font-bold">ثانیه</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[0, 1, 2, 3].map(optIdx => (
                              <div key={optIdx} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400">گزینه {optIdx + 1}</span>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`correct_opt_stage_${qIdx}`}
                                      checked={q.correctAnswer === optIdx}
                                      onChange={() => {
                                        const updated = [...stageForm.quizQuestions];
                                        updated[qIdx] = { ...updated[qIdx], correctAnswer: optIdx };
                                        setStageForm(prev => ({ ...prev, quizQuestions: updated }));
                                      }}
                                      className="accent-emerald-400"
                                    />
                                    <span className="text-[10px] text-emerald-400 font-bold">پاسخ صحیح</span>
                                  </label>
                                </div>
                                <input
                                  type="text"
                                  value={q.options[optIdx] || ''}
                                  onChange={e => {
                                    const updated = [...stageForm.quizQuestions];
                                    const opts = [...(updated[qIdx].options || ['', '', '', ''])];
                                    opts[optIdx] = e.target.value;
                                    updated[qIdx] = { ...updated[qIdx], options: opts };
                                    setStageForm(prev => ({ ...prev, quizQuestions: updated }));
                                  }}
                                  placeholder={`متن گزینه ${optIdx + 1}...`}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-2 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-300">تصویر یا آیکون اختصاصی مرحله (کمتر از ۱ مگابایت)</label>
                    <span className="text-[10px] text-amber-400">حداکثر ۱ مگابایت</span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {stageForm.customIconUrl ? (
                        <img src={stageForm.customIconUrl} alt="آیکون" className="w-full h-full object-cover" />
                      ) : (
                        <Image size={20} className="text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={stageForm.customIconUrl}
                        onChange={e => setStageForm(prev => ({ ...prev, customIconUrl: e.target.value }))}
                        placeholder="لینک آدرس مستقیم تصویر یا آپلود فایل..."
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <label className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer transition shrink-0 flex items-center gap-1">
                      <Upload size={14} />
                      <span>آپلود</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleStageIconUpload} />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">توضیحات کامل مرحله</label>
                  <textarea
                    rows={3}
                    value={stageForm.description}
                    onChange={e => setStageForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="شرح اهداف، شایستگی‌ها و مأموریت‌های این مرحله..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none"
                  />
                </div>



              </div>
            </form>

            {/* Sticky Modal Footer with Secondary Direct Submit */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/95 sticky bottom-0 z-20">
              <span className="text-[11px] text-cyan-300/80 font-medium hidden sm:inline">
                {editingStage ? 'در حال ویرایش مرحله موجود' : 'در حال تعریف مرحله جدید'}
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowStageModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold hover:text-white border border-slate-800 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveStage(e)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                  id="btn-footer-save-stage"
                >
                  <Check size={16} className="stroke-[3]" />
                  <span>{editingStage ? 'ثبت و بروزرسانی مرحله' : 'ثبت و ایجاد مرحله'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

