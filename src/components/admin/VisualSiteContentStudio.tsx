import React, { useState } from 'react';
import { 
  Sparkles, Video, Image as ImageIcon, Type, Layout, SlidersHorizontal, 
  Upload, Check, Play, Eye, RotateCcw, ArrowUp, ArrowDown, Plus, Trash2,
  Shield, Flame, Swords, Trophy, Compass, Flag, Target, Heart, Star, 
  Zap, Award, Bell, HelpCircle, Phone, Globe, Radio, ExternalLink,
  Monitor, Smartphone, Tablet, ChevronRight, Layers, FileVideo, Film,
  MessageCircle, Send, Info, Mail, MapPin, Clock, Edit3, MoveVertical,
  Palette, X, RefreshCw, CheckCircle2, ChevronDown, Move, CreditCard,
  Lock, Link as LinkIcon, GripVertical, Gift
} from 'lucide-react';
import { SiteSettings, PrizeItem } from '../../types';
import { injectCustomFontFace, injectCustomFontCssUrl } from '../../utils/dynamicFonts';
import AdventureHeroSection from '../home/AdventureHeroSection';
import PrizesAwardsBanner from '../home/PrizesAwardsBanner';
import SocialMessengersWidgets from '../home/SocialMessengersWidgets';
import AboutSection from '../home/AboutSection';
import Footer from '../home/Footer';
import CountdownTimerCard from '../home/CountdownTimerCard';
import { EnamadBadge } from '../common/EnamadBadge';
import { OFFICIAL_ENAMAD_HTML, sanitizeEnamadHtml } from '../../utils/enamadSanitizer';

interface VisualSiteContentStudioProps {
  siteSettings: SiteSettings;
  prizes?: PrizeItem[];
  onSaveSiteSettings: (updated: SiteSettings) => void;
  triggerAlert?: (msg: string) => void;
}

// Preset color options for quick picking
const PRESET_COLORS = [
  { name: 'فیروزه‌ای نئونی', hex: '#06b6d4', class: 'bg-cyan-500' },
  { name: 'طلایی و کهربایی', hex: '#f59e0b', class: 'bg-amber-500' },
  { name: 'صورتی سایبری', hex: '#ec4899', class: 'bg-pink-500' },
  { name: 'سبز زمردی', hex: '#10b981', class: 'bg-emerald-500' },
  { name: 'سفید درخشان', hex: '#ffffff', class: 'bg-white' },
  { name: 'بنفش ارغوانی', hex: '#a855f7', class: 'bg-purple-500' },
  { name: 'قرمز شعله‌ای', hex: '#ef4444', class: 'bg-red-500' },
  { name: 'سرخابی نئونی', hex: '#f43f5e', class: 'bg-rose-500' },
  { name: 'آبی کبالت سلطنتی', hex: '#2563eb', class: 'bg-blue-600' },
];

// Preset background color options for whole site
const BG_COLOR_PRESETS = [
  { name: 'مشکی تیره آبنوسی (پیش‌فرض تاکتیکال)', hex: '#030610', class: 'bg-[#030610]' },
  { name: 'بنفش ارغوانی دخترانه', hex: '#160424', class: 'bg-[#160424]' },
  { name: 'صورتی تیره سایبری دخترانه', hex: '#260822', class: 'bg-[#260822]' },
  { name: 'سرمه‌ای کبالت پسرانه', hex: '#050c24', class: 'bg-[#050c24]' },
  { name: 'مشکی مطلق اولد (OLED Pure)', hex: '#000000', class: 'bg-black' },
  { name: 'زغالی گرافیت مدرن', hex: '#0c101d', class: 'bg-[#0c101d]' },
  { name: 'فیروزه‌ای تیره اقیانوسی', hex: '#041822', class: 'bg-[#041822]' },
  { name: 'یاقوتی تیره آتشین', hex: '#20050a', class: 'bg-[#20050a]' },
];

// Available fonts
const AVAILABLE_FONTS = [
  { id: 'Vazirmatn, sans-serif', label: 'وزیرمتن (استاندارد و مدرن)', previewText: 'سامانه اتاق جنگ نوجوانان' },
  { id: 'Lalezar, cursive, sans-serif', label: 'لاله‌زار (حماسی، درشت و تیتر)', previewText: 'مأموریت بزرگ اتاق جنگ' },
  { id: 'Samim, sans-serif', label: 'صمیم (روان و خوانا)', previewText: 'پلتفرم جامع عملیات و مسابقات' },
  { id: 'Sahel, sans-serif', label: 'ساحل (هندسی و شیک)', previewText: 'ارزیابی هوشمند و تفکر استراتژیک' },
  { id: 'Shabnam, sans-serif', label: 'شبنم (مینیمال و تمیز)', previewText: 'رقابت جوخه‌ها و گردان‌های نبرد' },
  { id: 'Amiri, serif', label: 'امیری (سنتی و حماسی)', previewText: 'قرارگاه فرهنگی و اتاق جنگ' },
  { id: 'Markazi Text, serif', label: 'مرکزی تکست (کلاسیک و رسمی)', previewText: 'مرکز ارزیابی و تصمیم‌گیری' },
  { id: '"Segoe UI", Tahoma, Arial, sans-serif', label: 'سیستمی تاهوما (ساده)', previewText: 'مسابقات هفت‌خوان' },
];

// Quick Gateway Presets
const GATEWAY_PRESETS = [
  { title: 'درگاه پرداخت زرین‌پال', subtitle: 'پرداخت ایمن ۲۵۶ بیتی', link: 'https://zarinpal.com' },
  { title: 'درگاه پرداخت شاپرک / سداد', subtitle: 'سامانه جامع پرداخت الکترونیک', link: 'https://sadadpsp.ir' },
  { title: 'درگاه پرداخت بانک ملت (به‌پرداخت)', subtitle: 'تراکنش امن بانکی', link: 'http://behpardakht.com' },
  { title: 'درگاه پرداخت زیبال', subtitle: 'پرداخت سریع و مطمئن', link: 'https://zibal.ir' },
  { title: 'درگاه پرداخت پی‌پینگ', subtitle: 'سرویس امن مالی', link: 'https://payping.ir' },
];

// Quick Enamad Presets
const ENAMAD_PRESETS = [
  { title: 'نماد اعتماد الکترونیکی', subtitle: 'وزارت صنعت، معدن و تجارت', link: 'https://enamad.ir' },
  { title: 'نشان ملی ثبت (ساماندهی)', subtitle: 'مرکز فناوری اطلاعات و رسانه‌های دیجیتال', link: 'https://samandehi.ir' },
  { title: 'مجوز بنیاد ملی بازی‌های رایانه‌ای', subtitle: 'نظام رده‌بندی سنی ESRA', link: 'https://ircg.ir' },
];

// Default guide steps for game tutorial modal
const DEFAULT_GUIDE_STEPS = [
  {
    title: 'خوش آمدی فرمانده!',
    text: 'به سامانه بزرگ ماجراجویی و ارزیابی استراتژیک «اتاق جنگ» خوش آمدی! پرونده هفت‌خوان آماده آغاز است.',
    highlight: 'پرونده ویژه هفت‌خوان'
  },
  {
    title: 'نقشه عملیاتی و چالش‌ها',
    text: 'مسابقه شامل ۷ مرحله داستانی است. با ورود به هر مرحله، پاسخ به معماها و حل چالش‌های فکری، کریستال‌های امتیاز آزاد می‌شوند.',
    highlight: '۷ مرحله کارآگاهی'
  },
  {
    title: 'جوایز ۵۰ میلیارد ریالی',
    text: 'علاوه بر کنسول‌های بازی و تبلت برای برترین‌های کشوری، بیش از ۱۰۰ هزار جایزه و کد تخفیف برای تمام شرکت‌کنندگان در نظر گرفته شده است.',
    highlight: 'جوایز و امتیازات'
  }
];

export const VisualSiteContentStudio: React.FC<VisualSiteContentStudioProps> = ({
  siteSettings,
  prizes = [],
  onSaveSiteSettings,
  triggerAlert
}) => {
  // Master editable state
  const [form, setForm] = useState<SiteSettings>(() => ({
    ...siteSettings,
    siteFontFamily: siteSettings.siteFontFamily || 'Vazirmatn, sans-serif',
    customFontName: siteSettings.customFontName,
    customFontDataUrl: siteSettings.customFontDataUrl,
    customFontFormat: siteSettings.customFontFormat || 'woff2',
    customFontCssUrl: siteSettings.customFontCssUrl || '',
    animatedTextColor: siteSettings.animatedTextColor || '#06b6d4',
    titleColor: siteSettings.titleColor || '#ffffff',
    siteTextColor: siteSettings.siteTextColor || '#cbd5e1',
    accentColor: siteSettings.accentColor || '#06b6d4',
    siteThemeMode: siteSettings.siteThemeMode || 'boys',
    siteCustomBgColor: siteSettings.siteCustomBgColor || '#030610',
    siteBgPattern: siteSettings.siteBgPattern || 'grid',
    iconAnimatedText: siteSettings.iconAnimatedText !== undefined 
      ? siteSettings.iconAnimatedText 
      : 'به بزرگترین رویداد رقابتی و استراتژیک اتاق جنگ خوش آمدید!',
    pageIconText: siteSettings.pageIconText || '',
    pageIconSubtext: siteSettings.pageIconSubtext || '',
    customLogoUrl: siteSettings.customLogoUrl || '/images/logos/warroom_logo.webp',
    bannerLayout: siteSettings.bannerLayout || 'dual',
    girlsBannerImage: siteSettings.girlsBannerImage || '/images/banners/girls_registration_banner.webp',
    boysBannerImage: siteSettings.boysBannerImage || '/images/banners/boys_registration_banner.webp',
    adVideoUrl: siteSettings.adVideoUrl || '',
    adVideoTitle: siteSettings.adVideoTitle || 'تیزر حماسی معرفی مسابقات و جوایز قرارگاه',
    adVideoSubtitle: siteSettings.adVideoSubtitle || 'مشاهده مأموریت‌ها و جوایز میلیونی برای جوخه‌های برتر',
    adVideoBadge: siteSettings.adVideoBadge || 'ویژه و تبلیغاتی',
    homeSectionsOrder: siteSettings.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'],
    // 🏆 ویترین جایزه‌ها
    prizesSectionTitle: siteSettings.prizesSectionTitle !== undefined ? siteSettings.prizesSectionTitle : 'ویترین جایزه‌ها',
    prizesSectionSubtitle: siteSettings.prizesSectionSubtitle !== undefined ? siteSettings.prizesSectionSubtitle : 'کریستال جمع کن و جوایز ویژه سامانه را بازگشایی کن',
    prizesBadgeText: siteSettings.prizesBadgeText !== undefined ? siteSettings.prizesBadgeText : 'جوایز کشوری و استانی',
    prizesHeadingText: siteSettings.prizesHeadingText !== undefined ? siteSettings.prizesHeadingText : 'جوایز و هدایای ویژه برای نفرات برتر کشور و استان',
    prizesDescTitle: siteSettings.prizesDescTitle !== undefined ? siteSettings.prizesDescTitle : 'اهدای جوایز اختصاصی بر اساس کریستال‌های کسب‌شده',
    prizesDescText: siteSettings.prizesDescText !== undefined ? siteSettings.prizesDescText : 'تمام جوایز و امتیازات مورد نیاز توسط مدیر سامانه در پنل مدیریت تعیین و به روز می‌شوند.',
    prizesTopCardTitle: siteSettings.prizesTopCardTitle || '',
    prizesTopCardTag: siteSettings.prizesTopCardTag || '',
    prizesTopCardImage: siteSettings.prizesTopCardImage || '',
    prizesSideCard1Title: siteSettings.prizesSideCard1Title || '',
    prizesSideCard1Tag: siteSettings.prizesSideCard1Tag || '',
    prizesSideCard1Image: siteSettings.prizesSideCard1Image || '',
    prizesSideCard2Title: siteSettings.prizesSideCard2Title || '',
    prizesSideCard2Tag: siteSettings.prizesSideCard2Tag || '',
    prizesSideCard2Image: siteSettings.prizesSideCard2Image || '',
    prizesFeature1Title: siteSettings.prizesFeature1Title || '',
    prizesFeature1Desc: siteSettings.prizesFeature1Desc || '',
    prizesFeature1IconUrl: siteSettings.prizesFeature1IconUrl || '',
    prizesFeature2Title: siteSettings.prizesFeature2Title || '',
    prizesFeature2Desc: siteSettings.prizesFeature2Desc || '',
    prizesFeature2IconUrl: siteSettings.prizesFeature2IconUrl || '',
    prizesFeature3Title: siteSettings.prizesFeature3Title || '',
    prizesFeature3Desc: siteSettings.prizesFeature3Desc || '',
    prizesFeature3IconUrl: siteSettings.prizesFeature3IconUrl || '',
    prizesFeature4Title: siteSettings.prizesFeature4Title || '',
    prizesFeature4Desc: siteSettings.prizesFeature4Desc || '',
    prizesFeature4IconUrl: siteSettings.prizesFeature4IconUrl || '',

    // 💬 پیام‌رسان‌های بله و ایتا و دکمه‌های راهنما
    baleBadgeText: siteSettings.baleBadgeText || 'پیام‌رسان بله',
    baleHandle: siteSettings.baleHandle || '@warroom_app',
    baleChannelTitle: siteSettings.baleChannelTitle !== undefined ? siteSettings.baleChannelTitle : 'اخبار و اطلاعیه‌های رسمی اتاق جنگ',
    baleChannelSubtitle: siteSettings.baleChannelSubtitle !== undefined ? siteSettings.baleChannelSubtitle : 'اطلاعیه‌های فوری ستاد برگزاری، اعلام برندگان هفتگی و زمان‌بندی جوایز.',
    baleButtonText: siteSettings.baleButtonText || 'کانال اتاق جنگ در بله',
    baleChannelUrl: siteSettings.baleChannelUrl || 'https://ble.ir/warroom_app',
    baleLogoUrl: siteSettings.baleLogoUrl || '',

    eitaaBadgeText: siteSettings.eitaaBadgeText || 'پیام‌رسان ایتا',
    eitaaHandle: siteSettings.eitaaHandle || '@hisstory_official',
    eitaaChannelTitle: siteSettings.eitaaChannelTitle !== undefined ? siteSettings.eitaaChannelTitle : 'روایت‌ها و پشت صحنه اتاق جنگ',
    eitaaChannelSubtitle: siteSettings.eitaaChannelSubtitle !== undefined ? siteSettings.eitaaChannelSubtitle : 'روایت‌های اختصاصی کارآگاهان، سرنخ‌های مخفی مراحل و چالش‌های ویژه روزانه.',
    eitaaButtonText: siteSettings.eitaaButtonText || 'کانال اتاق جنگ در ایتا',
    eitaaChannelUrl: siteSettings.eitaaChannelUrl || 'https://eitaa.com/hisstory_official',
    eitaaLogoUrl: siteSettings.eitaaLogoUrl || '',

    stagesButtonTitle: siteSettings.stagesButtonTitle || 'مراحل مسابقه',
    stagesButtonSubtitle: siteSettings.stagesButtonSubtitle || 'نقشه ۷ مرحله ماجراجویی',
    stagesButtonIconUrl: siteSettings.stagesButtonIconUrl || '',
    guideButtonTitle: siteSettings.guideButtonTitle || 'راهنمای مسابقه',
    guideButtonSubtitle: siteSettings.guideButtonSubtitle || 'قوانین و نحوه امتیازگیری',
    guideButtonIconUrl: siteSettings.guideButtonIconUrl || '',

    // ℹ️ درباره ما و اهداف سامانه
    aboutSectionTitle: siteSettings.aboutSectionTitle !== undefined ? siteSettings.aboutSectionTitle : 'درباره ما و پروژه اتاق جنگ',
    aboutSectionSubtitle: siteSettings.aboutSectionSubtitle !== undefined ? siteSettings.aboutSectionSubtitle : 'معرفی اهداف و رسالت سامانه',
    aboutSectionText: siteSettings.aboutSectionText !== undefined ? siteSettings.aboutSectionText : 'پلتفرم اتاق جنگ، سامانه جامع شبیه‌سازی تصمیم‌گیری استراتژیک، ارزیابی هوشمند و رقابت‌های گروهی دانش‌آموزی است که با هدف ارتقای آگاهی و تفکر تفکیکی طراحی گردیده است.',
    aboutSectionIconUrl: siteSettings.aboutSectionIconUrl || '',
    aboutSectionBannerImage: siteSettings.aboutSectionBannerImage || '',
    aboutSectionBadgeText: siteSettings.aboutSectionBadgeText || '',
    aboutFeature1Title: siteSettings.aboutFeature1Title || '',
    aboutFeature1Desc: siteSettings.aboutFeature1Desc || '',
    aboutFeature2Title: siteSettings.aboutFeature2Title || '',
    aboutFeature2Desc: siteSettings.aboutFeature2Desc || '',
    aboutFeature3Title: siteSettings.aboutFeature3Title || '',
    aboutFeature3Desc: siteSettings.aboutFeature3Desc || '',

    footerPhone: siteSettings.footerPhone || '021-88997766',
    footerEmail: siteSettings.footerEmail || 'support@warroom.ir',
    footerAddress: siteSettings.footerAddress || 'نشانی: تهران، خیابان آزادی، مرکز نوآوری‌های استراتژیک، پلاک ۱۱۰',
    footerHours: siteSettings.footerHours || 'ساعات پاسخگویی: شنبه تا چهارشنبه ۸:۰۰ الی ۱۶:۰۰',
    footerLogoIconUrl: siteSettings.footerLogoIconUrl || '',
    footerTitle: siteSettings.footerTitle || 'سامانه ملی «اتاق جنگ»',
    footerSubtitle: siteSettings.footerSubtitle || 'سامانه استراتژیک و ارزیابی اتاق جنگ',
    footerAboutText: siteSettings.footerAboutText || '',
    gatewayTitle: siteSettings.gatewayTitle !== undefined ? siteSettings.gatewayTitle : 'درگاه پرداخت زرین‌پال',
    gatewaySubtitle: siteSettings.gatewaySubtitle !== undefined ? siteSettings.gatewaySubtitle : 'پرداخت ایمن ۲۵۶ بیتی',
    gatewayIconUrl: siteSettings.gatewayIconUrl || '',
    gatewayLinkUrl: siteSettings.gatewayLinkUrl || '',
    enamadTitle: siteSettings.enamadTitle !== undefined ? siteSettings.enamadTitle : 'نماد اعتماد الکترونیکی',
    enamadSubtitle: siteSettings.enamadSubtitle !== undefined ? siteSettings.enamadSubtitle : 'وزارت صنعت، معدن و تجارت',
    enamadIconUrl: siteSettings.enamadIconUrl || '',
    enamadLinkUrl: siteSettings.enamadLinkUrl || '',
    enamadEnabled: siteSettings.enamadEnabled !== undefined ? siteSettings.enamadEnabled : true,
    enamadHtmlCode: siteSettings.enamadHtmlCode || OFFICIAL_ENAMAD_HTML,
    customFooterBadges: siteSettings.customFooterBadges || [],
    copyrightText: siteSettings.copyrightText || '',
    guideSteps: siteSettings.guideSteps && siteSettings.guideSteps.length > 0 ? siteSettings.guideSteps : DEFAULT_GUIDE_STEPS,
    boysGuideImage: siteSettings.boysGuideImage || '',
    girlsGuideImage: siteSettings.girlsGuideImage || '',
    showCountdownTimer: siteSettings.showCountdownTimer !== undefined ? siteSettings.showCountdownTimer : false,
    countdownTitle: siteSettings.countdownTitle || 'مهلت ثبت‌نام و آغاز رویداد بزرگ اتاق جنگ',
    heroCountdown: siteSettings.heroCountdown || '۰۲:۱۴:۳۹:۱۵',
    countdownTargetDate: siteSettings.countdownTargetDate || '',
    countdownPosition: siteSettings.countdownPosition || 'middle',
    countdownStyle: siteSettings.countdownStyle || 'tactical',
    removeTimerBorder: siteSettings.removeTimerBorder !== undefined ? siteSettings.removeTimerBorder : true,
    disableBannerLinks: siteSettings.disableBannerLinks || false,
    hideRegistrationBanners: siteSettings.hideRegistrationBanners || false,
    hideBannersOnExpiry: siteSettings.hideBannersOnExpiry !== undefined ? siteSettings.hideBannersOnExpiry : true,
  }));

  // Drag and Drop States
  const [isDraggingTimer, setIsDraggingTimer] = useState(false);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);

  // Sidebar Tab state
  const [sidebarTab, setSidebarTab] = useState<'prizes' | 'messengers' | 'about' | 'banners' | 'footer' | 'sections' | 'style' | 'video' | 'guide'>('prizes');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Section Metas for Reordering
  const SECTION_METAS: { [key: string]: { name: string; desc: string; icon: any } } = {
    hero: { name: 'بخش ۱: بنرهای ثبت‌نام، لوگو و تیزر', desc: 'لوگو، متن انیمیشنی، بنر دختران و پسران و پلیر تیزر', icon: Swords },
    prizes: { name: 'بخش ۲: ویترین جایزه‌ها و هدایا', desc: 'کارت‌های جوایز، عنوان و کریستال‌های مورد نیاز', icon: Trophy },
    messengers: { name: 'بخش ۳: کانال‌های بله و ایتا و راهنما', desc: 'لینک‌های بله و ایتا و دکمه‌های مراحل و راهنما', icon: MessageCircle },
    about: { name: 'بخش ۴: درباره ما و اهداف پروژه', desc: 'باکس معرفی و رسالت سامانه اتاق جنگ', icon: Info },
    footer: { name: 'بخش ۵: دبیرخانه، تلفن، درگاه و اینماد', desc: 'شماره تلفن، آیکون‌های درگاه و اینماد با لینک هدایت', icon: Phone },
  };

  const currentSectionsOrder = (() => {
    const list = form.homeSectionsOrder && form.homeSectionsOrder.length > 0 
      ? form.homeSectionsOrder 
      : ['hero', 'prizes', 'messengers', 'about', 'footer'];
    return list.filter(s => s !== 'timer');
  })();

  // Handle reorder sections
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...currentSectionsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    // Synchronize countdownPosition if timer was moved
    let newPosition = form.countdownPosition;
    const timerIdx = newOrder.indexOf('timer');
    const heroIdx = newOrder.indexOf('hero');
    if (timerIdx !== -1 && heroIdx !== -1) {
      if (timerIdx < heroIdx) {
        newPosition = 'top';
      } else if (timerIdx >= newOrder.length - 2) {
        newPosition = 'bottom';
      } else {
        newPosition = 'middle';
      }
    }

    setForm(prev => ({
      ...prev,
      homeSectionsOrder: newOrder,
      countdownPosition: newPosition,
    }));
    if (triggerAlert) {
      triggerAlert(`ترتیب بخش‌ها تغییر یافت (${SECTION_METAS[temp]?.name || temp})`);
    }
  };

  // Handle delete section from simulator preview & page order
  const handleDeleteSection = (index: number) => {
    const targetKey = currentSectionsOrder[index];
    const newOrder = currentSectionsOrder.filter((_, i) => i !== index);
    setForm(prev => ({
      ...prev,
      showCountdownTimer: targetKey === 'timer' ? false : prev.showCountdownTimer,
      homeSectionsOrder: newOrder
    }));
    if (triggerAlert) {
      triggerAlert(`بخش «${SECTION_METAS[targetKey]?.name || targetKey}» از صفحه حذف شد.`);
    }
  };

  // Helper to clear a field
  const handleClearField = (field: keyof SiteSettings) => {
    setForm(prev => ({ ...prev, [field]: '' }));
    if (triggerAlert) triggerAlert('این مورد با موفقیت پاک شد و در صفحه مخفی می‌شود.');
  };

  // Handle file uploads
  const handleImageUpload = (field: keyof SiteSettings, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setForm(prev => ({ ...prev, [field]: result }));
        if (triggerAlert) triggerAlert('تصویر/آیکون جدید با موفقیت بارگذاری شد.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle custom badge image upload
  const handleBadgeImageUpload = (badgeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setForm(prev => ({
          ...prev,
          customFooterBadges: (prev.customFooterBadges || []).map(b => 
            b.id === badgeId ? { ...b, iconUrl: result } : b
          )
        }));
        if (triggerAlert) triggerAlert('آیکون نماد سفارشی بارگذاری شد.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new custom footer badge
  const handleAddCustomBadge = () => {
    const newBadge = {
      id: `badge_${Date.now()}`,
      title: 'مجوز و نماد جدید',
      subtitle: 'سازمان مربوطه',
      iconUrl: '',
      linkUrl: '',
      isActive: true
    };
    setForm(prev => ({
      ...prev,
      customFooterBadges: [...(prev.customFooterBadges || []), newBadge]
    }));
    if (triggerAlert) triggerAlert('نماد سفارشی جدید اضافه شد. اکنون می‌توانید آیکون و لینک هدایت آن را تنظیم کنید.');
  };

  // Remove custom footer badge
  const handleRemoveCustomBadge = (badgeId: string) => {
    setForm(prev => ({
      ...prev,
      customFooterBadges: (prev.customFooterBadges || []).filter(b => b.id !== badgeId)
    }));
    if (triggerAlert) triggerAlert('نماد حذف شد.');
  };

  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 80 * 1024 * 1024) {
        if (triggerAlert) triggerAlert('حجم فایل بیش از ۸۰ مگابایت است.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setForm(prev => ({ ...prev, adVideoUrl: result }));
        if (triggerAlert) triggerAlert('ویدئوی تیزر بارگذاری شد.');
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔤 Handle custom font file upload (.woff2, .woff, .ttf, .otf)
  const handleFontFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      if (triggerAlert) triggerAlert('حجم فایل فونت بیش از حد مجاز است (حداکثر ۱۲ مگابایت).');
      return;
    }

    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
    const fontName = `UploadedFont_${cleanName}`;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'woff2';

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      injectCustomFontFace(fontName, dataUrl, ext);

      setForm(prev => ({
        ...prev,
        customFontName: fontName,
        customFontDataUrl: dataUrl,
        customFontFormat: ext,
        siteFontFamily: `"${fontName}", Vazirmatn, sans-serif`
      }));

      if (triggerAlert) {
        triggerAlert(`فونت اختصاصی «${file.name}» با موفقیت آپلود و روی کل سایت اعمال شد!`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove custom font
  const handleRemoveCustomFont = () => {
    setForm(prev => ({
      ...prev,
      customFontName: undefined,
      customFontDataUrl: undefined,
      customFontFormat: undefined,
      siteFontFamily: 'Vazirmatn, sans-serif'
    }));
    if (triggerAlert) triggerAlert('فونت آپلودشده حذف شد و فونت پیش‌فرض وزیرمتن فعال گردید.');
  };

  // Save changes
  const handleSave = () => {
    onSaveSiteSettings(form);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 3000);
    if (triggerAlert) {
      triggerAlert('تمامی تغییرات آیکون‌های فوتر، لینک‌های درگاه و اینماد، متن‌ها و فونت در سایت منتشر گردید!');
    }
  };

  // Render actual component based on section key
  const renderActualSection = (secKey: string) => {
    const isGirls = form.siteThemeMode === 'girls';
    const dynamicTheme = isGirls ? 'girls' : 'boys';

    switch (secKey) {
      case 'hero':
        return (
          <AdventureHeroSection 
            themeMode={dynamicTheme}
            currentUser={null}
            siteSettings={form}
            onOpenRegister={() => {}}
            onSelectTheme={() => {}}
            onGoToDashboard={() => {}}
          />
        );
      case 'prizes':
        return (
          <PrizesAwardsBanner 
            themeMode={dynamicTheme}
            prizes={prizes}
            siteSettings={form}
            onExplorePrizes={() => {}}
          />
        );
      case 'messengers':
        return (
          <SocialMessengersWidgets 
            themeMode={dynamicTheme}
            siteSettings={form}
            onOpenStages={() => {}}
            onOpenGuide={() => {}}
            triggerAlert={() => {}}
          />
        );
      case 'about':
        return (
          <AboutSection 
            siteSettings={form}
            onOpenMore={() => {}}
          />
        );
      case 'footer':
        return (
          <Footer 
            themeMode={dynamicTheme}
            siteSettings={form}
            onNavigate={() => {}}
            onOpenAbout={() => {}}
            triggerAlert={triggerAlert}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 dir-rtl select-none font-sans" dir="rtl">
      
      {/* 1. TOP MASTER CUSTOMIZER TOOLBAR */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#060c1d] border border-cyan-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
            <Layout size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white">استودیوی مدیریت و سفارشی‌سازی صفحه اصلی</h2>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                isSavedRecently 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' 
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSavedRecently ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                <span>{isSavedRecently ? 'تغییرات با موفقیت ذخیره شدند' : 'پیش‌نمایش زنده در شبیه‌ساز'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تغییر آیکون و عکس درگاه‌ها و اینماد با لینک هدایت، ویرایش یا حذف متن‌ها، تنظیم فونت و بنرها
            </p>
          </div>
        </div>

        {/* Viewport switchers & Save */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {/* Responsive device buttons */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                previewDevice === 'desktop' ? 'bg-cyan-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="نمای دسکتاپ و مانیتور"
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">دسکتاپ</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('tablet')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                previewDevice === 'tablet' ? 'bg-cyan-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="نمای تبلت"
            >
              <Tablet size={14} />
              <span className="hidden sm:inline">تبلت</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                previewDevice === 'mobile' ? 'bg-cyan-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="نمای موبایل"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">موبایل</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
              isSavedRecently
                ? 'bg-emerald-500 text-slate-950 scale-105'
                : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:brightness-110 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
            }`}
            id="btn-save-customizer"
          >
            <Check size={16} />
            <span>{isSavedRecently ? 'تغییرات ذخیره شد' : 'ذخیره و انتشار در سایت'}</span>
          </button>
        </div>
      </div>

      {/* 2. SPLIT WORKSPACE: SIDEBAR CONTROLS (4 COLS) + EXACT LIVE SITE SIMULATOR (8 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================================= */}
        {/* RIGHT: CUSTOMIZER SIDEBAR CONTROLS                                        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 bg-[#080d21] border border-cyan-500/30 rounded-3xl p-3.5 sm:p-4 shadow-2xl">
          
          {/* Sidebar Nav Tabs (9 Comprehensive Sections) */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5 pb-2 border-b border-slate-800/80 text-center">
            {/* 1. ویترین جوایز */}
            <button
              type="button"
              onClick={() => setSidebarTab('prizes')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'prizes'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="ویرایش عکس‌ها، عنوان‌ها و متون ویترین جوایز"
            >
              <Trophy size={16} className="text-amber-400" />
              <span>ویترین جوایز</span>
            </button>

            {/* 2. مدیریت راهنمای بازی */}
            <button
              type="button"
              onClick={() => setSidebarTab('guide')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'guide'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-400/60 shadow-[0_0_12px_rgba(249,115,22,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="مدیریت متون دیالوگ‌ها و عکس‌های کاراکتر راهنما"
            >
              <HelpCircle size={16} className="text-orange-400" />
              <span>مدیریت راهنما</span>
            </button>

            {/* 2. کانال‌های بله و ایتا */}
            <button
              type="button"
              onClick={() => setSidebarTab('messengers')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'messengers'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/60 shadow-[0_0_12px_rgba(59,130,246,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="لوگوها، عناوین، متن‌ها و لینک‌های بله و ایتا و دکمه‌های راهنما"
            >
              <MessageCircle size={16} className="text-blue-400" />
              <span>بله و ایتا</span>
            </button>

            {/* 3. سامانه و درباره ما */}
            <button
              type="button"
              onClick={() => setSidebarTab('about')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'about'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="معرفی سامانه، عکس‌ها، عناوین، توضیحات و رسالت"
            >
              <Info size={16} className="text-emerald-400" />
              <span>سامانه و درباره</span>
            </button>

            {/* 4. بنرها و ثبت‌نام */}
            <button
              type="button"
              onClick={() => setSidebarTab('banners')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'banners'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="بنرهای ثبت‌نام دختران و پسران، لوگو و چینش"
            >
              <Layout size={16} className="text-cyan-400" />
              <span>بنرها و ثبت‌نام</span>
            </button>

            {/* 5. فوتر و نمادها */}
            <button
              type="button"
              onClick={() => setSidebarTab('footer')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'footer'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-400/60 shadow-[0_0_12px_rgba(20,184,166,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="آیکون‌ها، درگاه پرداخت و نماد اینماد با لینک هدایت"
            >
              <CreditCard size={16} className="text-teal-400" />
              <span>فوتر و درگاه</span>
            </button>

            {/* 6. ترتیب بخش‌ها */}
            <button
              type="button"
              onClick={() => setSidebarTab('sections')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'sections'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/60 shadow-[0_0_12px_rgba(99,102,241,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="ترتیب و جابه‌جایی بخش‌های صفحه اصلی"
            >
              <MoveVertical size={16} className="text-indigo-400" />
              <span>ترتیب بخش‌ها</span>
            </button>

            {/* 7. فونت و رنگ */}
            <button
              type="button"
              onClick={() => setSidebarTab('style')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'style'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="فونت و رنگ متن‌ها"
            >
              <Palette size={16} className="text-purple-400" />
              <span>فونت و رنگ</span>
            </button>

            {/* 8. ویدئو */}
            <button
              type="button"
              onClick={() => setSidebarTab('video')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'video'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="ویدئوی تیزر مسابقه"
            >
              <Film size={16} className="text-rose-400" />
              <span>ویدئو تیزر</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB: FOOTER, GATEWAYS & ENAMAD ICONS (آیکون‌های درگاه، اینماد و فوتر با لینک هدایت) */}
          {/* ========================================================================= */}
          {sidebarTab === 'footer' && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 leading-relaxed">
                🛡️ در این قسمت می‌توانید عکس/آیکون <strong>درگاه پرداخت</strong> و <strong>اینماد</strong> را با آپلود عکس دلخواه تغییر داده و <strong>لینک هدایت</strong> به صفحه درگاه یا مجوز را مشخص کنید.
              </div>

              {/* 🌟 1. PAYMENT GATEWAY ICON & REDIRECT LINK (درگاه پرداخت) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
                      <CreditCard size={14} />
                    </div>
                    <span className="text-xs font-black text-cyan-300">آیکون و لینک درگاه پرداخت:</span>
                  </div>
                  {form.gatewayTitle && (
                    <button
                      type="button"
                      onClick={() => handleClearField('gatewayTitle')}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded transition"
                      title="مخفی‌سازی درگاه پرداخت"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Gateway Icon Preview & Direct Upload */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0 overflow-hidden shadow">
                    {form.gatewayIconUrl ? (
                      <img src={form.gatewayIconUrl} alt="درگاه" className="w-full h-full object-contain p-1" />
                    ) : (
                      <CreditCard size={24} className="text-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">آیکون فعلی درگاه</span>
                      {form.gatewayIconUrl && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, gatewayIconUrl: '' }))}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          حذف عکس
                        </button>
                      )}
                    </div>
                    <label className="w-full py-1.5 px-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-[11px] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-95 transition">
                      <Upload size={12} />
                      <span>آپلود آیکون درگاه (عکس)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload('gatewayIconUrl', e)}
                      />
                    </label>
                  </div>
                </div>

                {/* Gateway Title & Subtitle */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">عنوان درگاه پرداخت:</label>
                  <input
                    type="text"
                    value={form.gatewayTitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, gatewayTitle: e.target.value }))}
                    placeholder="مثال: درگاه پرداخت زرین‌پال"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    value={form.gatewaySubtitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, gatewaySubtitle: e.target.value }))}
                    placeholder="زیرنویس: پرداخت ایمن ۲۵۶ بیتی"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-400"
                  />
                </div>

                {/* 🔗 Gateway Redirect Link Input */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-cyan-300 flex items-center gap-1">
                      <LinkIcon size={12} />
                      <span>لینک هدایت هنگام کلیک روی درگاه:</span>
                    </label>
                    {form.gatewayLinkUrl && (
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                        لینک فعال
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={form.gatewayLinkUrl || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, gatewayLinkUrl: e.target.value }))}
                    placeholder="https://zarinpal.com یا آدرس درگاه..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono dir-ltr outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    کاربر با کلیک روی نماد درگاه پرداخت در فوتر، به این آدرس هدایت خواهد شد.
                  </p>
                </div>

                {/* Quick Presets for Gateways */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block mb-1">انتخاب سریع درگاه‌های معتبر:</span>
                  <div className="flex flex-wrap gap-1">
                    {GATEWAY_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            gatewayTitle: p.title,
                            gatewaySubtitle: p.subtitle,
                            gatewayLinkUrl: p.link
                          }));
                          if (triggerAlert) triggerAlert(`تنظیمات «${p.title}» اعمال شد.`);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] transition cursor-pointer"
                      >
                        {p.title.replace('درگاه پرداخت ', '')}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* 🌟 2. ENAMAD / OFFICIAL TRUST SEAL (اینماد و نماد اعتماد الکترونیکی رسمی) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-500/40">
                      <CheckCircle2 size={14} />
                    </div>
                    <span className="text-xs font-black text-amber-300">نماد اعتماد الکترونیکی (اینماد رسمی):</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    form.enamadEnabled !== false 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' 
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}>
                    {form.enamadEnabled !== false ? 'فعال در سایت' : 'غیرفعال'}
                  </span>
                </div>

                {/* Enabled / Disabled Toggle */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] font-bold text-white">وضعیت نمایش نماد در فوتر:</span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, enamadEnabled: true }))}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                        form.enamadEnabled !== false ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      فعال
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, enamadEnabled: false }))}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                        form.enamadEnabled === false ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      غیرفعال
                    </button>
                  </div>
                </div>

                {/* Official eNAMAD HTML Code Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 block">کد HTML رسمی اینماد:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, enamadHtmlCode: OFFICIAL_ENAMAD_HTML, enamadEnabled: true }));
                        if (triggerAlert) triggerAlert('کد رسمی اینماد بازنشانی شد.');
                      }}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw size={10} />
                      <span>بازنشانی به کد رسمی</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    dir="ltr"
                    value={form.enamadHtmlCode || OFFICIAL_ENAMAD_HTML}
                    onChange={(e) => setForm(prev => ({ ...prev, enamadHtmlCode: e.target.value }))}
                    className="w-full bg-[#030610] border border-slate-800 focus:border-amber-400 rounded-xl p-2.5 text-[11px] text-amber-200/90 font-mono leading-relaxed outline-none shadow-inner"
                    placeholder="کد رسمی HTML اینماد..."
                  />
                </div>

                {/* Live Preview Inside Footer Tab */}
                <div className="p-3 rounded-xl bg-[#030610] border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
                  <span className="text-[10px] text-slate-400">پیش‌نمایش زنده لوگوی اینماد:</span>
                  {form.enamadEnabled !== false ? (
                    <EnamadBadge 
                      htmlCode={form.enamadHtmlCode} 
                      enabled={true} 
                      previewMode={true} 
                    />
                  ) : (
                    <span className="text-[11px] text-slate-500 font-bold">لوگو در حالت غیرفعال است.</span>
                  )}
                </div>
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block mb-1">انتخاب سریع مجوزها:</span>
                  <div className="flex flex-wrap gap-1">
                    {ENAMAD_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            enamadTitle: p.title,
                            enamadSubtitle: p.subtitle,
                            enamadLinkUrl: p.link
                          }));
                          if (triggerAlert) triggerAlert(`تنظیمات «${p.title}» اعمال شد.`);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] transition cursor-pointer"
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* 🌟 3. CUSTOM ADDITIONAL FOOTER BADGES (افزودن سایر نمادها و مجوزها) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-500/40">
                      <Shield size={14} />
                    </div>
                    <span className="text-xs font-black text-purple-300">سایر نمادها و مجوزهای اختصاصی:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomBadge}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] flex items-center gap-1 transition shadow cursor-pointer active:scale-95"
                  >
                    <Plus size={12} />
                    <span>افزودن نماد جدید</span>
                  </button>
                </div>

                {Array.isArray(form.customFooterBadges) && form.customFooterBadges.map((badge, idx) => (
                  <div key={badge.id} className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-200">نماد #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomBadge(badge.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="حذف این نماد"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={badge.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm(prev => ({
                            ...prev,
                            customFooterBadges: (prev.customFooterBadges || []).map(b => b.id === badge.id ? { ...b, title: val } : b)
                          }));
                        }}
                        placeholder="عنوان نماد..."
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={badge.subtitle || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm(prev => ({
                            ...prev,
                            customFooterBadges: (prev.customFooterBadges || []).map(b => b.id === badge.id ? { ...b, subtitle: val } : b)
                          }));
                        }}
                        placeholder="زیرعنوان..."
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={badge.linkUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm(prev => ({
                            ...prev,
                            customFooterBadges: (prev.customFooterBadges || []).map(b => b.id === badge.id ? { ...b, linkUrl: val } : b)
                          }));
                        }}
                        placeholder="لینک هدایت: https://..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white font-mono dir-ltr"
                      />
                      <label className="px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1 shrink-0">
                        <Upload size={11} />
                        <span>عکس</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleBadgeImageUpload(badge.id, e)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* 🌟 4. FOOTER LOGO & TEXT (لوگو و مشخصات فوتر) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-black text-white block">لوگو و معرفی سامانه در فوتر:</span>
                
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {form.footerLogoIconUrl || form.customLogoUrl ? (
                      <img src={form.footerLogoIconUrl || form.customLogoUrl} alt="لوگوی فوتر" className="w-full h-full object-cover" />
                    ) : (
                      <Shield size={20} className="text-cyan-400" />
                    )}
                  </div>
                  <label className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition">
                    <Upload size={12} />
                    <span>آپلود لوگوی اختصاصی فوتر</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('footerLogoIconUrl', e)}
                    />
                  </label>
                </div>

                <input
                  type="text"
                  value={form.footerTitle || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, footerTitle: e.target.value }))}
                  placeholder="عنوان سامانه در فوتر (سامانه ملی «اتاق جنگ»)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
                <textarea
                  rows={2}
                  value={form.footerAboutText || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, footerAboutText: e.target.value }))}
                  placeholder="متن توضیحی کوتاه فوتر..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white leading-relaxed"
                />
              </div>

              {/* 🌟 5. SECRETARIAT CONTACT DETAILS (تلفن و اطلاعات دبیرخانه) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-black text-rose-300 block">اطلاعات دبیرخانه و پشتیبانی فوتر:</span>
                <input
                  type="text"
                  value={form.footerPhone || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, footerPhone: e.target.value }))}
                  placeholder="تلفن پشتیبانی: 021-88997766"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white dir-ltr font-mono"
                />
                <input
                  type="text"
                  value={form.footerHours || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, footerHours: e.target.value }))}
                  placeholder="ساعات پاسخگویی: شنبه تا چهارشنبه ۸:۰۰ الی ۱۶:۰۰"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={form.footerEmail || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, footerEmail: e.target.value }))}
                  placeholder="ایمیل پشتیبانی: support@warroom.ir"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white dir-ltr font-mono"
                />
                <input
                  type="text"
                  value={form.footerAddress || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, footerAddress: e.target.value }))}
                  placeholder="نشانی دبیرخانه..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={form.copyrightText || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, copyrightText: e.target.value }))}
                  placeholder="متن کپی‌رایت..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300"
                />
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: BANNERS & LAYOUT (بنرها و لوگو)                                       */}
          {/* ========================================================================= */}
          {sidebarTab === 'banners' && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              
              {/* Layout Switcher: Dual vs Single */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
                <span className="text-xs font-black text-amber-300 block">چینش بنرهای ثبت‌نام:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, bannerLayout: 'dual' }));
                      if (triggerAlert) triggerAlert('حالت بنرها: دو لاینی در کنار هم فعال شد.');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                      form.bannerLayout === 'dual'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <div className="flex gap-1">
                      <span className="w-5 h-6 rounded bg-pink-500/60 inline-block" />
                      <span className="w-5 h-6 rounded bg-blue-500/60 inline-block" />
                    </div>
                    <span>دو لاینی (کنار هم)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, bannerLayout: 'single' }));
                      if (triggerAlert) triggerAlert('حالت بنرها: تک‌لاینی زیر هم فعال شد.');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                      form.bannerLayout === 'single'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="w-10 h-3 rounded bg-pink-500/60 inline-block" />
                      <span className="w-10 h-3 rounded bg-blue-500/60 inline-block" />
                    </div>
                    <span>تک‌لاینی (زیر هم)</span>
                  </button>
                </div>
              </div>

              {/* Logo / Header Icon Upload */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white block">تصویر لوگوی اول صفحه:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.customLogoUrl || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, customLogoUrl: e.target.value }))}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-white font-mono dir-ltr"
                  />
                  <label className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl cursor-pointer">
                    <Upload size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('customLogoUrl', e)}
                    />
                  </label>
                </div>
              </div>

              {/* Girls Banner Upload */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-pink-500/30 space-y-2">
                <span className="text-xs font-bold text-pink-300 block">عکس بنر دختران:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.girlsBannerImage || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, girlsBannerImage: e.target.value }))}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-white font-mono dir-ltr"
                  />
                  <label className="p-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-xl cursor-pointer">
                    <Upload size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('girlsBannerImage', e)}
                    />
                  </label>
                </div>
              </div>

              {/* Boys Banner Upload */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-2">
                <span className="text-xs font-bold text-blue-300 block">عکس بنر پسران:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.boysBannerImage || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, boysBannerImage: e.target.value }))}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-white font-mono dir-ltr"
                  />
                  <label className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-xl cursor-pointer">
                    <Upload size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('boysBannerImage', e)}
                    />
                  </label>
                </div>
              </div>

              {/* 🛡️ BANNER MANAGEMENT: DISABLE REGISTRATION REDIRECT & AUTO REMOVE ON EXPIRY */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border-0 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-950/80 text-purple-400 flex items-center justify-center">
                      <Lock size={14} />
                    </div>
                    <span className="text-xs font-black text-purple-300">مدیریت رفتار بنرها و ثبت‌نام:</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  {/* Toggle 1: Disable Banner Links (عدم هدایت به ثبت‌نام و ورود و برداشتن بنرها) */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border-0 cursor-pointer hover:bg-slate-850 transition">
                    <input
                      type="checkbox"
                      checked={Boolean(form.disableBannerLinks)}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, disableBannerLinks: e.target.checked }));
                        if (triggerAlert) {
                          triggerAlert(e.target.checked 
                            ? 'بنرها غیرفعال و برداشته شدند؛ کاربران به صفحه ثبت‌نام و ورود نمی‌روند.' 
                            : 'بنرها مجدداً فعال شدند.');
                        }
                      }}
                      className="w-4 h-4 mt-0.5 accent-purple-500 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">غیرفعال‌سازی و برداشتن بنرها (عدم نمایش و عدم هدایت به ثبت‌نام و ورود)</span>
                      <span className="text-[10px] text-slate-400 leading-relaxed block mt-0.5">
                        با فعال‌سازی این گزینه، هر دو بنر به صورت کامل از صفحه اصلی برداشته شده و کاربران به صفحه ثبت‌نام یا ورود هدایت نمی‌شوند.
                      </span>
                    </div>
                  </label>

                  {/* Toggle 2: Auto Remove Banners on Timer Expiry (حذف خودکار پس از پایان زمان تایمر) */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border-0 cursor-pointer hover:bg-slate-850 transition">
                    <input
                      type="checkbox"
                      checked={form.hideBannersOnExpiry !== false}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, hideBannersOnExpiry: e.target.checked }));
                        if (triggerAlert) {
                          triggerAlert(e.target.checked 
                            ? 'حذف خودکار بنرها پس از پایان تایمر فعال شد.' 
                            : 'حذف خودکار بنرها غیرفعال شد.');
                        }
                      }}
                      className="w-4 h-4 mt-0.5 accent-amber-500 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">حذف خودکار دو بنر پس از اتمام زمان یا خاموش شدن تایمر</span>
                      <span className="text-[10px] text-slate-400 leading-relaxed block mt-0.5">
                        به محض رسیدن شمارش معکوس به صفر یا غیرفعال شدن تایمر، هر دو بنر به صورت خودکار از صفحه برداشته می‌شوند.
                      </span>
                    </div>
                  </label>

                  {/* Toggle 3: Hide Banners Immediately (مخفی‌سازی کامل بنرها) */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border-0 cursor-pointer hover:bg-slate-850 transition">
                    <input
                      type="checkbox"
                      checked={Boolean(form.hideRegistrationBanners)}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, hideRegistrationBanners: e.target.checked }));
                        if (triggerAlert) {
                          triggerAlert(e.target.checked 
                            ? 'دو بنر ثبت‌نام در صفحه اصلی مخفی شدند.' 
                            : 'دو بنر ثبت‌نام در صفحه اصلی نمایان شدند.');
                        }
                      }}
                      className="w-4 h-4 mt-0.5 accent-rose-500 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">مخفی‌سازی دستی و کامل دو بنر</span>
                      <span className="text-[10px] text-slate-400 leading-relaxed block mt-0.5">
                        هر دو بنر دخترانه و پسرانه از صفحه اصلی کاملاً برداشته می‌شوند.
                      </span>
                    </div>
                  </label>

                </div>
              </div>

              {/* 🎨 SITE THEME & BACKGROUND CUSTOMIZATION (ویرایش بگراند و رنگ‌آمیزی کل سایت: تم دخترانه و پسرانه) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/40 space-y-4 shadow-xl">
                
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                      <Palette size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-purple-200 block">پوسته، رنگ‌آمیزی و بک‌گراند کل سایت:</span>
                      <span className="text-[10px] text-slate-400">تغییر تم دخترانه / پسرانه و انتخاب رنگ پس‌زمینه</span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                    form.siteThemeMode === 'girls'
                      ? 'bg-pink-950 text-pink-300 border-pink-500/40'
                      : form.siteThemeMode === 'custom'
                      ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                      : 'bg-blue-950 text-blue-300 border-blue-500/40'
                  }`}>
                    {form.siteThemeMode === 'girls' ? 'تم دخترانه فعال' : form.siteThemeMode === 'custom' ? 'تم دلخواه' : 'تم پسرانه فعال'}
                  </span>
                </div>

                {/* 1. THEME MODE PRESETS (تم دخترانه، پسرانه، تاکتیکال و دلخواه) */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">انتخاب تم و فضای رنگی اصلی سایت:</label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Girls Theme Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          siteThemeMode: 'girls',
                          siteCustomBgColor: '#160424',
                          siteBgPattern: 'aurora',
                          accentColor: '#f43f5e',
                          animatedTextColor: '#ec4899',
                          titleColor: '#ffffff'
                        }));
                        if (triggerAlert) triggerAlert('🌸 تم جذاب دخترانه (صورتی/ارغوانی نئونی) برای کل سایت فعال شد.');
                      }}
                      className={`p-3 rounded-xl border text-right transition cursor-pointer active:scale-95 ${
                        form.siteThemeMode === 'girls'
                          ? 'bg-gradient-to-br from-pink-950/80 via-purple-950 to-rose-950 border-pink-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.35)] ring-1 ring-pink-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-pink-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-pink-300 flex items-center gap-1.5">
                          <span>🌸 تم دخترانه</span>
                        </span>
                        {form.siteThemeMode === 'girls' && <span className="text-[9px] bg-pink-500 text-slate-950 px-1.5 py-0.2 rounded font-black">فعال ✓</span>}
                      </div>
                      <p className="text-[10px] text-pink-200/80 leading-relaxed">
                        بک‌گراند ارغوانی نئونی، درخشش صورتی و بنفش، با کارت‌های شیشه‌ای ویژه دختران.
                      </p>
                    </button>

                    {/* Boys Theme Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          siteThemeMode: 'boys',
                          siteCustomBgColor: '#030610',
                          siteBgPattern: 'grid',
                          accentColor: '#06b6d4',
                          animatedTextColor: '#06b6d4',
                          titleColor: '#ffffff'
                        }));
                        if (triggerAlert) triggerAlert('⚡ تم تاکتیکال پسرانه (آبی کبالت / قرمز رزمی) برای کل سایت فعال شد.');
                      }}
                      className={`p-3 rounded-xl border text-right transition cursor-pointer active:scale-95 ${
                        form.siteThemeMode === 'boys' || !form.siteThemeMode
                          ? 'bg-gradient-to-br from-blue-950/80 via-slate-900 to-red-950 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                          <span>⚡ تم پسرانه (تاکتیکال)</span>
                        </span>
                        {(form.siteThemeMode === 'boys' || !form.siteThemeMode) && <span className="text-[9px] bg-cyan-400 text-slate-950 px-1.5 py-0.2 rounded font-black">فعال ✓</span>}
                      </div>
                      <p className="text-[10px] text-cyan-200/80 leading-relaxed">
                        بک‌گراند تاکتیکال آبنوسی، نورهای کبالت و سرخ با گرید نظامی ۳۲ پیکسلی.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. BACKGROUND COLOR PICKER & PRESET PALETTES */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-purple-400" />
                      <span>رنگ پس‌زمینه (Background Color):</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 dir-ltr">{form.siteCustomBgColor || '#030610'}</span>
                      <span 
                        className="w-5 h-5 rounded-lg border border-white/40 shadow-inner"
                        style={{ backgroundColor: form.siteCustomBgColor || '#030610' }}
                      />
                    </div>
                  </div>

                  {/* Preset Colors Grid */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">پالت‌های سریع پس‌زمینه:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BG_COLOR_PRESETS.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, siteCustomBgColor: c.hex }));
                            if (triggerAlert) triggerAlert(`رنگ پس‌زمینه به «${c.name}» تغییر یافت.`);
                          }}
                          className={`p-1.5 rounded-lg border text-center transition flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                            form.siteCustomBgColor === c.hex
                              ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-slate-900 shadow-md'
                              : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md border border-white/20 shadow ${c.class}`} />
                          <span className="text-[8px] text-slate-300 font-bold truncate max-w-full">{c.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Hex Color Picker Input */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <label className="text-[10px] text-slate-400 shrink-0">کد رنگ دقیق:</label>
                    <input
                      type="text"
                      value={form.siteCustomBgColor || '#030610'}
                      onChange={(e) => setForm(prev => ({ ...prev, siteCustomBgColor: e.target.value }))}
                      placeholder="#030610"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono dir-ltr outline-none focus:border-purple-400"
                    />
                    <input
                      type="color"
                      value={form.siteCustomBgColor || '#030610'}
                      onChange={(e) => setForm(prev => ({ ...prev, siteCustomBgColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                      title="انتخاب رنگ پس‌زمینه با پالت"
                    />
                  </div>
                </div>

                {/* 3. BACKGROUND PATTERN & ATMOSPHERE */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200">الگو و بافت پس‌زمینه (Background Texture):</label>
                    <span className="text-[9px] text-cyan-400 font-mono">
                      {form.siteBgPattern === 'aurora' ? 'شفق نئونی' : form.siteBgPattern === 'stars' ? 'ستاره‌ای' : form.siteBgPattern === 'dots' ? 'ذرات ماتریسی' : form.siteBgPattern === 'none' ? 'ساده و یکدست' : 'گرید نظامی'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'grid', label: 'گرید نظامی', desc: 'خطوط ۳۲px' },
                      { id: 'aurora', label: 'شفق نئونی', desc: 'هاله رنگی' },
                      { id: 'stars', label: 'ستاره‌ای', desc: 'کیهانی' },
                      { id: 'dots', label: 'ذرات نوری', desc: 'ماتریسی' },
                      { id: 'none', label: 'یکدست', desc: 'ساده بدون بافت' },
                    ].map(pat => (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, siteBgPattern: pat.id as any }));
                          if (triggerAlert) triggerAlert(`الگوی «${pat.label}» اعمال گردید.`);
                        }}
                        className={`p-2 rounded-xl text-center border text-[10px] transition cursor-pointer active:scale-95 ${
                          (form.siteBgPattern || 'grid') === pat.id
                            ? 'bg-purple-950/70 border-purple-400 text-purple-200 font-bold shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="block font-bold">{pat.label}</span>
                        <span className="text-[8px] opacity-70">{pat.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. ACCENT & BUTTONS COLOR */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200">رنگ شاخص دکمه‌ها و المان‌ها (Accent Color):</label>
                    <span 
                      className="w-4 h-4 rounded-full border border-white/40 shadow"
                      style={{ backgroundColor: form.accentColor || '#06b6d4' }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, accentColor: c.hex }));
                          if (triggerAlert) triggerAlert(`رنگ شاخص به «${c.name}» تغییر یافت.`);
                        }}
                        className={`w-7 h-7 rounded-xl border transition-transform cursor-pointer ${c.class} ${
                          form.accentColor === c.hex ? 'scale-125 border-white ring-2 ring-purple-400' : 'border-transparent hover:scale-110'
                        }`}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={form.accentColor || '#06b6d4'}
                      onChange={(e) => setForm(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-7 h-7 rounded-xl cursor-pointer bg-transparent border-0"
                      title="انتخاب رنگ دلخواه با جعبه رنگ"
                    />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: SECTIONS REORDERING (ترتیب و جابه‌جایی بخش‌ها)                       */}
          {/* ========================================================================= */}
          {sidebarTab === 'sections' && (
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 leading-relaxed">
                🚀 برای تغییر ترتیب بخش‌ها در صفحه اصلی، می‌توانید هر کارت را با <strong>درگ و دراپ (Drag & Drop)</strong> بکشید و رها کنید، یا از دکمه‌های <strong>بالا</strong> و <strong>پایین</strong> استفاده نمایید:
              </div>

              <div className="space-y-2">
                {currentSectionsOrder.map((secKey, index) => {
                  const meta = SECTION_METAS[secKey] || { name: secKey, desc: '', icon: Layers };
                  const IconComp = meta.icon;
                  const isFirst = index === 0;
                  const isLast = index === currentSectionsOrder.length - 1;

                  return (
                    <div
                      key={secKey}
                      draggable
                      onDragStart={(e) => {
                        setDraggedSectionIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverSectionIndex(index);
                      }}
                      onDragLeave={() => {
                        if (dragOverSectionIndex === index) setDragOverSectionIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedSectionIndex !== null && draggedSectionIndex !== index) {
                          const newOrder = [...currentSectionsOrder];
                          const [item] = newOrder.splice(draggedSectionIndex, 1);
                          newOrder.splice(index, 0, item);

                          let newPosition = form.countdownPosition;
                          const timerIdx = newOrder.indexOf('timer');
                          const heroIdx = newOrder.indexOf('hero');
                          if (timerIdx !== -1 && heroIdx !== -1) {
                            if (timerIdx < heroIdx) {
                              newPosition = 'top';
                            } else if (timerIdx >= newOrder.length - 2) {
                              newPosition = 'bottom';
                            } else {
                              newPosition = 'middle';
                            }
                          }

                          setForm(prev => ({ ...prev, homeSectionsOrder: newOrder, countdownPosition: newPosition }));
                          if (triggerAlert) triggerAlert(`بخش «${SECTION_METAS[item]?.name || item}» با موفقیت جابه‌جا شد.`);
                        }
                        setDraggedSectionIndex(null);
                        setDragOverSectionIndex(null);
                      }}
                      className={`p-3 rounded-2xl bg-slate-950 border transition flex items-center justify-between shadow-md cursor-grab active:cursor-grabbing select-none ${
                        dragOverSectionIndex === index
                          ? 'border-cyan-400 bg-cyan-950/60 scale-[1.02] shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 font-mono text-xs font-black shrink-0">
                          <GripVertical size={14} className="text-slate-400 hover:text-white" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <IconComp size={14} className="text-emerald-400" />
                            <span>{meta.name}</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{meta.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveSection(index, 'up')}
                          className={`p-1.5 rounded-xl border transition ${
                            isFirst
                              ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                              : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/50 cursor-pointer active:scale-95'
                          }`}
                          title="حرکت به بالا"
                        >
                          <ArrowUp size={14} />
                        </button>

                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveSection(index, 'down')}
                          className={`p-1.5 rounded-xl border transition ${
                            isLast
                              ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                              : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/50 cursor-pointer active:scale-95'
                          }`}
                          title="حرکت به پایین"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: GUIDE MANAGEMENT (مدیریت متون دیالوگ‌ها و عکس‌های کاراکتر راهنما)        */}
          {/* ========================================================================= */}
          {sidebarTab === 'guide' && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              <div className="p-2.5 rounded-xl bg-orange-950/40 border border-orange-500/30 text-[11px] text-orange-200 leading-relaxed flex items-center gap-2">
                <HelpCircle size={18} className="text-orange-400 shrink-0" />
                <span>🧭 در این بخش می‌توانید <strong>متون دیالوگ‌های گام به گام راهنما</strong> و <strong>تصاویر کاراکترهای راهنمای دختر و پسر</strong> را ویرایش، اضافه یا حذف کنید.</span>
              </div>

              {/* Guide Characters Images */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-orange-500/30 space-y-3 shadow-lg">
                <span className="text-xs font-black text-orange-300 block">تصاویر کاراکترهای راهنمای بازی:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Boy character */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-cyan-300 block">کاراکتر پسر:</span>
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-500 mx-auto bg-slate-950">
                      <img src={form.boysGuideImage || form.boysBannerImage || '/src/assets/images/guide_commander_boy_1790940066682.jpg'} alt="پسر" className="w-full h-full object-cover" />
                    </div>
                    <label className="w-full py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[10px] font-black rounded-lg flex items-center justify-center gap-1 cursor-pointer transition">
                      <Upload size={11} />
                      <span>آپلود عکس پسر</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload('boysGuideImage', e)}
                      />
                    </label>
                  </div>

                  {/* Girl character */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-fuchsia-300 block">کاراکتر دختر:</span>
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-fuchsia-500 mx-auto bg-slate-950">
                      <img src={form.girlsGuideImage || form.girlsBannerImage || '/src/assets/images/guide_commander_girl_1790940078146.jpg'} alt="دختر" className="w-full h-full object-cover" />
                    </div>
                    <label className="w-full py-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[10px] font-black rounded-lg flex items-center justify-center gap-1 cursor-pointer transition">
                      <Upload size={11} />
                      <span>آپلود عکس دختر</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload('girlsGuideImage', e)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Dynamic Guide Steps */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300">گام‌های دیالوگ راهنما:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newSteps = [...(form.guideSteps || DEFAULT_GUIDE_STEPS)];
                      newSteps.push({
                        title: `گام جدید #${newSteps.length + 1}`,
                        text: 'متن جدید توضیحات راهنمای بازی...',
                        highlight: 'نکته کلیدی'
                      });
                      setForm(prev => ({ ...prev, guideSteps: newSteps }));
                      if (triggerAlert) triggerAlert('گام جدید به دیالوگ‌های راهنما اضافه شد.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 transition shadow cursor-pointer active:scale-95"
                  >
                    <Plus size={12} />
                    <span>افزودن گام جدید</span>
                  </button>
                </div>

                {(form.guideSteps || DEFAULT_GUIDE_STEPS).map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-300">گام شماره {idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const steps = [...(form.guideSteps || DEFAULT_GUIDE_STEPS)];
                            const temp = steps[idx];
                            steps[idx] = steps[idx - 1];
                            steps[idx - 1] = temp;
                            setForm(prev => ({ ...prev, guideSteps: steps }));
                          }}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="انتقال به بالا"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === (form.guideSteps || DEFAULT_GUIDE_STEPS).length - 1}
                          onClick={() => {
                            const steps = [...(form.guideSteps || DEFAULT_GUIDE_STEPS)];
                            const temp = steps[idx];
                            steps[idx] = steps[idx + 1];
                            steps[idx + 1] = temp;
                            setForm(prev => ({ ...prev, guideSteps: steps }));
                          }}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="انتقال به پایین"
                        >
                          <ArrowDown size={12} />
                        </button>
                        {(form.guideSteps || DEFAULT_GUIDE_STEPS).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const steps = (form.guideSteps || DEFAULT_GUIDE_STEPS).filter((_, i) => i !== idx);
                              setForm(prev => ({ ...prev, guideSteps: steps }));
                              if (triggerAlert) triggerAlert(`گام شماره ${idx + 1} حذف شد.`);
                            }}
                            className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                            title="حذف این گام"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">عنوان دیالوگ:</label>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          const steps = [...(form.guideSteps || DEFAULT_GUIDE_STEPS)];
                          steps[idx] = { ...steps[idx], title: val };
                          setForm(prev => ({ ...prev, guideSteps: steps }));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">متن توضیحات:</label>
                      <textarea
                        rows={2}
                        value={step.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          const steps = [...(form.guideSteps || DEFAULT_GUIDE_STEPS)];
                          steps[idx] = { ...steps[idx], text: val };
                          setForm(prev => ({ ...prev, guideSteps: steps }));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: PRIZES & SHOWCASE (ویترین جایزه‌ها: تمامی عکس‌ها، کارت‌ها، عناوین و متون) */}
          {/* ========================================================================= */}
          {sidebarTab === 'prizes' && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
                🏆 در این بخش می‌توانید <strong>تمامی عکس‌ها، کارت‌های جوایز، عناوین و متون ساده</strong> ویترین جایزه‌ها را به طور کامل تغییر دهید یا با دکمه سطل زباله پاک کنید.
              </div>

              {/* 1. Header Titles & Subtitles */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-400" />
                    <span>عنوان‌ها و متون سربرگ ویترین:</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">عنوان اصلی بخش ویترین:</label>
                    <input
                      type="text"
                      value={form.prizesSectionTitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, prizesSectionTitle: e.target.value }))}
                      placeholder="ویترین جایزه‌ها"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">زیرنویس و شعار تشویقی:</label>
                    <input
                      type="text"
                      value={form.prizesSectionSubtitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, prizesSectionSubtitle: e.target.value }))}
                      placeholder="کریستال جمع کن و جوایز ویژه سامانه را بازگشایی کن"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">برچسب/نشان بالای تیتر جوایز:</label>
                    <input
                      type="text"
                      value={form.prizesBadgeText || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, prizesBadgeText: e.target.value }))}
                      placeholder="جوایز کشوری و استانی"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">تیتر درشت معرفی جوایز:</label>
                    <input
                      type="text"
                      value={form.prizesHeadingText || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, prizesHeadingText: e.target.value }))}
                      placeholder="جوایز و هدایای ویژه برای نفرات برتر کشور و استان"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Three Centerpiece Award Cards (عکس‌ها، عنوان‌ها و برچسب‌های ۳ کارت جوایز) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 shadow-lg">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>عکس‌ها و مشخصات ۳ کارت اصلی جوایز:</span>
                </span>

                {/* Card 1: Main Center Top Prize */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-300">🥇 جایزه اصلی و وسط (بزرگ):</span>
                    {form.prizesTopCardImage && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, prizesTopCardImage: '' }))}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        حذف عکس
                      </button>
                    )}
                  </div>

                  {/* Image Upload & Preview */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-center shrink-0 overflow-hidden shadow">
                      {form.prizesTopCardImage ? (
                        <img src={form.prizesTopCardImage} alt="جایزه اصلی" className="w-full h-full object-cover" />
                      ) : (
                        <Gift size={22} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 shadow active:scale-95">
                        <Upload size={13} />
                        <span>آپلود عکس جایزه اصلی</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload('prizesTopCardImage', e)}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={form.prizesTopCardImage || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesTopCardImage: e.target.value }))}
                        placeholder="یا لینک اینترنتی عکس (URL)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">نام جایزه:</label>
                      <input
                        type="text"
                        value={form.prizesTopCardTitle || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesTopCardTitle: e.target.value }))}
                        placeholder="جوایز ارزنده سامانه"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">برچسب / امتیاز:</label>
                      <input
                        type="text"
                        value={form.prizesTopCardTag || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesTopCardTag: e.target.value }))}
                        placeholder="رتبه اول کشوری"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-amber-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Side Card 1 (چپ) */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-cyan-300">🥈 کارت جایزه سمت چپ:</span>
                    {form.prizesSideCard1Image && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, prizesSideCard1Image: '' }))}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        حذف عکس
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center shrink-0 overflow-hidden shadow">
                      {form.prizesSideCard1Image ? (
                        <img src={form.prizesSideCard1Image} alt="جایزه ۲" className="w-full h-full object-cover" />
                      ) : (
                        <Gift size={20} className="text-cyan-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 shadow active:scale-95">
                        <Upload size={13} />
                        <span>آپلود عکس جایزه چپ</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload('prizesSideCard1Image', e)}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={form.prizesSideCard1Image || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesSideCard1Image: e.target.value }))}
                        placeholder="یا لینک عکس (URL)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">نام جایزه:</label>
                      <input
                        type="text"
                        value={form.prizesSideCard1Title || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesSideCard1Title: e.target.value }))}
                        placeholder="جایزه ویژه"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">برچسب / امتیاز:</label>
                      <input
                        type="text"
                        value={form.prizesSideCard1Tag || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesSideCard1Tag: e.target.value }))}
                        placeholder="ویترین"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-cyan-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 3: Side Card 2 (راست) */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-pink-300">🥉 کارت جایزه سمت راست:</span>
                    {form.prizesSideCard2Image && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, prizesSideCard2Image: '' }))}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        حذف عکس
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-pink-500/40 flex items-center justify-center shrink-0 overflow-hidden shadow">
                      {form.prizesSideCard2Image ? (
                        <img src={form.prizesSideCard2Image} alt="جایزه ۳" className="w-full h-full object-cover" />
                      ) : (
                        <Award size={20} className="text-pink-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="w-full py-1.5 px-3 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-black text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 shadow active:scale-95">
                        <Upload size={13} />
                        <span>آپلود عکس جایزه راست</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload('prizesSideCard2Image', e)}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={form.prizesSideCard2Image || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesSideCard2Image: e.target.value }))}
                        placeholder="یا لینک عکس (URL)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">نام جایزه:</label>
                      <input
                        type="text"
                        value={form.prizesSideCard2Title || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesSideCard2Title: e.target.value }))}
                        placeholder="هدایای رده‌بندی"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">برچسب / امتیاز:</label>
                      <input
                        type="text"
                        value={form.prizesSideCard2Tag || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, prizesSideCard2Tag: e.target.value }))}
                        placeholder="برترین‌ها"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-pink-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Description Box (کادر توضیحات بن خرید و کریستال‌ها) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-amber-300 block">متن کادر توضیحات و کریستال‌های جوایز:</span>
                <input
                  type="text"
                  value={form.prizesDescTitle || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, prizesDescTitle: e.target.value }))}
                  placeholder="اهدای جوایز اختصاصی بر اساس کریستال‌های کسب‌شده"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
                <textarea
                  rows={2}
                  value={form.prizesDescText || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, prizesDescText: e.target.value }))}
                  placeholder="تمام جوایز و امتیازات مورد نیاز توسط مدیر سامانه در پنل مدیریت تعیین و به روز می‌شوند."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white leading-relaxed"
                />
              </div>

              {/* 4. Four Highlight Feature Badges (۴ ویژگی و هدایای دیجیتال/الکترونیک) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-amber-300 block">۴ نشان و هدایای خرد پایین ویترین:</span>

                {[
                  { keyT: 'prizesFeature1Title', keyD: 'prizesFeature1Desc', keyI: 'prizesFeature1IconUrl', defaultT: 'جوایز دیجیتال و الکترونیک', defaultD: 'تعریف در پنل ادمین', num: '۱' },
                  { keyT: 'prizesFeature2Title', keyD: 'prizesFeature2Desc', keyI: 'prizesFeature2IconUrl', defaultT: 'کنسول بازی و هدایای ویژه', defaultD: 'بر اساس امتیازات', num: '۲' },
                  { keyT: 'prizesFeature3Title', keyD: 'prizesFeature3Desc', keyI: 'prizesFeature3IconUrl', defaultT: 'تبلت‌های دانش‌آموزی و قلم', defaultD: 'برندگان استانی', num: '۳' },
                  { keyT: 'prizesFeature4Title', keyD: 'prizesFeature4Desc', keyI: 'prizesFeature4IconUrl', defaultT: 'بسته‌های هدیه و نشان‌ها', defaultD: 'نفرات برتر', num: '۴' },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">مورد {item.num}:</span>
                      <label className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1">
                        <Upload size={11} />
                        <span>آپلود آیکون</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(item.keyI as any, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={(form as any)[item.keyT] || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, [item.keyT]: e.target.value }))}
                        placeholder={item.defaultT}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                      <input
                        type="text"
                        value={(form as any)[item.keyD] || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, [item.keyD]: e.target.value }))}
                        placeholder={item.defaultD}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MESSENGERS & GUIDES (کانال‌های بله و ایتا و دکمه‌های راهنما و مراحل) */}
          {/* ========================================================================= */}
          {sidebarTab === 'messengers' && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200 leading-relaxed">
                💬 در این بخش می‌توانید <strong>لوگوها، تصاویر، عناوین، متن‌های توضیحی، متن دکمه‌ها و لینک هدایت</strong> کانال‌های بله و ایتا و دکمه‌های راهنما را ویرایش کنید.
              </div>

              {/* 1. Eitaa Channel Customizer */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-orange-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-orange-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                    <span>کانال رسمی ایتا (Eitaa):</span>
                  </span>
                  {form.eitaaLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, eitaaLogoUrl: '' }))}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      حذف لوگو
                    </button>
                  )}
                </div>

                {/* Eitaa Logo Upload */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-orange-950 border border-orange-500/50 flex items-center justify-center shrink-0 overflow-hidden shadow">
                    {form.eitaaLogoUrl ? (
                      <img src={form.eitaaLogoUrl} alt="ایتا" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-orange-400">ایتا</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 shadow active:scale-95">
                      <Upload size={13} />
                      <span>آپلود لوگوی دلخواه ایتا</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('eitaaLogoUrl', e)}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={form.eitaaLogoUrl || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, eitaaLogoUrl: e.target.value }))}
                      placeholder="یا آدرس اینترنتی لوگو (URL)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                    />
                  </div>
                </div>

                {/* Eitaa Texts */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">برچسب پیام‌رسان:</label>
                      <input
                        type="text"
                        value={form.eitaaBadgeText || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, eitaaBadgeText: e.target.value }))}
                        placeholder="پیام‌رسان ایتا"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">شناسه کانال (Handle):</label>
                      <input
                        type="text"
                        value={form.eitaaHandle || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, eitaaHandle: e.target.value }))}
                        placeholder="@hisstory_official"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-orange-300 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">عنوان کانال ایتا:</label>
                    <input
                      type="text"
                      value={form.eitaaChannelTitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, eitaaChannelTitle: e.target.value }))}
                      placeholder="روایت‌ها و پشت‌صحنه اتاق جنگ"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">متن توضیحات کانال ایتا:</label>
                    <textarea
                      rows={2}
                      value={form.eitaaChannelSubtitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, eitaaChannelSubtitle: e.target.value }))}
                      placeholder="روایت‌های اختصاصی کارآگاهان، سرنخ‌های مخفی مراحل و چالش‌های ویژه روزانه."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">متن دکمه هدایت:</label>
                      <input
                        type="text"
                        value={form.eitaaButtonText || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, eitaaButtonText: e.target.value }))}
                        placeholder="کانال اتاق جنگ در ایتا"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">لینک کانال ایتا:</label>
                      <input
                        type="text"
                        value={form.eitaaChannelUrl || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, eitaaChannelUrl: e.target.value }))}
                        placeholder="https://eitaa.com/hisstory_official"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Bale Channel Customizer */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>کانال رسمی بله (Bale):</span>
                  </span>
                  {form.baleLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, baleLogoUrl: '' }))}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      حذف لوگو
                    </button>
                  )}
                </div>

                {/* Bale Logo Upload */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center shrink-0 overflow-hidden shadow">
                    {form.baleLogoUrl ? (
                      <img src={form.baleLogoUrl} alt="بله" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-emerald-400">بله</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 shadow active:scale-95">
                      <Upload size={13} />
                      <span>آپلود لوگوی دلخواه بله</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('baleLogoUrl', e)}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={form.baleLogoUrl || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, baleLogoUrl: e.target.value }))}
                      placeholder="یا آدرس اینترنتی لوگو (URL)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                    />
                  </div>
                </div>

                {/* Bale Texts */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">برچسب پیام‌رسان:</label>
                      <input
                        type="text"
                        value={form.baleBadgeText || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, baleBadgeText: e.target.value }))}
                        placeholder="پیام‌رسان بله"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">شناسه کانال (Handle):</label>
                      <input
                        type="text"
                        value={form.baleHandle || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, baleHandle: e.target.value }))}
                        placeholder="@warroom_app"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">عنوان کانال بله:</label>
                    <input
                      type="text"
                      value={form.baleChannelTitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, baleChannelTitle: e.target.value }))}
                      placeholder="اخبار و اطلاعیه‌های رسمی اتاق جنگ"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">متن توضیحات کانال بله:</label>
                    <textarea
                      rows={2}
                      value={form.baleChannelSubtitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, baleChannelSubtitle: e.target.value }))}
                      placeholder="اطلاعیه‌های فوری ستاد برگزاری، اعلام برندگان هفتگی و زمان‌بندی جوایز."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">متن دکمه هدایت:</label>
                      <input
                        type="text"
                        value={form.baleButtonText || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, baleButtonText: e.target.value }))}
                        placeholder="کانال اتاق جنگ در بله"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">لینک کانال بله:</label>
                      <input
                        type="text"
                        value={form.baleChannelUrl || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, baleChannelUrl: e.target.value }))}
                        placeholder="https://ble.ir/warroom_app"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Quick Navigation Guides (مراحل مسابقه و راهنمای مسابقه) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white block">دکمه‌های راهنما و مراحل نبرد:</span>

                {/* Guide Button 1: مراحل مسابقه */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-300">🗺️ دکمه ۱: مراحل مسابقه</span>
                    <label className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1">
                      <Upload size={11} />
                      <span>آپلود آیکون</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('stagesButtonIconUrl', e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={form.stagesButtonTitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, stagesButtonTitle: e.target.value }))}
                      placeholder="مراحل مسابقه"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                    />
                    <input
                      type="text"
                      value={form.stagesButtonSubtitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, stagesButtonSubtitle: e.target.value }))}
                      placeholder="نقشه ۷ مرحله ماجراجویی"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-400"
                    />
                  </div>
                </div>

                {/* Guide Button 2: راهنمای مسابقه */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300">📖 دکمه ۲: راهنمای مسابقه</span>
                    <label className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1">
                      <Upload size={11} />
                      <span>آپلود آیکون</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('guideButtonIconUrl', e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={form.guideButtonTitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, guideButtonTitle: e.target.value }))}
                      placeholder="راهنمای مسابقه"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                    />
                    <input
                      type="text"
                      value={form.guideButtonSubtitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, guideButtonSubtitle: e.target.value }))}
                      placeholder="قوانین و نحوه امتیازگیری"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ABOUT US & SYSTEM MISSION (درباره سامانه و پروژه: عکس‌ها، عناوین و متون) */}
          {/* ========================================================================= */}
          {sidebarTab === 'about' && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 leading-relaxed">
                ℹ️ در این بخش می‌توانید <strong>لوگو/آیکون، تصویر بنر، عنوان‌ها، زیرنویس و متن کامل معرفی سامانه</strong> را به همراه ۳ کارت ارزش‌های کلیدی تغییر دهید.
              </div>

              {/* 1. System Icon & Banner Image Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 shadow-lg">
                <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                  <Info size={14} className="text-emerald-400" />
                  <span>عکس‌ها و نشان‌های بخش درباره سامانه:</span>
                </span>

                {/* Icon Upload */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center shrink-0 overflow-hidden shadow">
                    {form.aboutSectionIconUrl ? (
                      <img src={form.aboutSectionIconUrl} alt="لوگو" className="w-full h-full object-cover" />
                    ) : (
                      <Info size={22} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 shadow active:scale-95">
                      <Upload size={13} />
                      <span>آپلود آیکون/لوگوی سامانه</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('aboutSectionIconUrl', e)}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={form.aboutSectionIconUrl || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, aboutSectionIconUrl: e.target.value }))}
                      placeholder="یا لینک عکس (URL)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                    />
                  </div>
                </div>

                {/* Optional Banner Image Upload */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">تصویر بنر بالای بخش درباره سامانه (اختیاری):</span>
                    {form.aboutSectionBannerImage && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, aboutSectionBannerImage: '' }))}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        حذف بنر
                      </button>
                    )}
                  </div>
                  <label className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-bold text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95">
                    <Upload size={13} />
                    <span>آپلود تصویر بنر درباره سامانه</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('aboutSectionBannerImage', e)}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={form.aboutSectionBannerImage || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, aboutSectionBannerImage: e.target.value }))}
                    placeholder="یا لینک تصویر بنر (URL)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white"
                  />
                </div>
              </div>

              {/* 2. Titles and Description */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 shadow-lg">
                <span className="text-xs font-black text-emerald-300 block">عنوان‌ها و متن توضیحی سامانه:</span>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">برچسب/تگ کوچک:</label>
                  <input
                    type="text"
                    value={form.aboutSectionBadgeText || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, aboutSectionBadgeText: e.target.value }))}
                    placeholder="معرفی سامانه"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">عنوان اصلی بخش:</label>
                  <input
                    type="text"
                    value={form.aboutSectionTitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, aboutSectionTitle: e.target.value }))}
                    placeholder="درباره ما و پروژه اتاق جنگ"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">زیرنویس کوتاه:</label>
                  <input
                    type="text"
                    value={form.aboutSectionSubtitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, aboutSectionSubtitle: e.target.value }))}
                    placeholder="معرفی اهداف، ساختار و رسالت سامانه"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] text-slate-400">متن کامل معرفی و رسالت سامانه:</label>
                    {form.aboutSectionText && (
                      <button
                        type="button"
                        onClick={() => handleClearField('aboutSectionText')}
                        className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition"
                        title="پاک کردن متن"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={form.aboutSectionText || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, aboutSectionText: e.target.value }))}
                    placeholder="پلتفرم اتاق جنگ، سامانه جامع شبیه‌سازی تصمیم‌گیری استراتژیک، ارزیابی هوشمند و رقابت‌های گروهی دانش‌آموزی است..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white leading-relaxed outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* 3. Three Key Features Highlights */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-emerald-300 block">۳ ارزش و ویژگی کلیدی سامانه:</span>

                {[
                  { keyT: 'aboutFeature1Title', keyD: 'aboutFeature1Desc', defaultT: 'شبیه‌سازی استراتژیک', defaultD: 'تصمیم‌گیری در شرایط بحران نبرد', num: '۱' },
                  { keyT: 'aboutFeature2Title', keyD: 'aboutFeature2Desc', defaultT: 'ارزیابی هوشمند', defaultD: 'سنجش تفکر تحلیلی و تاکتیکی', num: '۲' },
                  { keyT: 'aboutFeature3Title', keyD: 'aboutFeature3Desc', defaultT: 'رقابت‌های تیمی', defaultD: 'هم‌افزایی جوخه‌ها و گردان‌ها', num: '۳' },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-300">ویژگی {item.num}:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={(form as any)[item.keyT] || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, [item.keyT]: e.target.value }))}
                        placeholder={item.defaultT}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                      <input
                        type="text"
                        value={(form as any)[item.keyD] || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, [item.keyD]: e.target.value }))}
                        placeholder={item.defaultD}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: FONTS & TEXT COLORS (فونت و رنگ‌ها)                                 */}
          {/* ========================================================================= */}
          {sidebarTab === 'style' && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              
              {/* Font Family Selector & Font Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                    <Type size={14} />
                    <span>فونت اختصاصی و فونت‌های آماده:</span>
                  </label>
                  <span className="text-[10px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40 font-mono">
                    فرمت‌های woff2, woff, ttf
                  </span>
                </div>

                {/* Direct Font File Upload */}
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Upload size={13} className="text-purple-400" />
                      <span>بارگذاری فایل فونت دلخواه:</span>
                    </span>
                    <label className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[11px] cursor-pointer transition flex items-center gap-1.5 shadow-md active:scale-95">
                      <Upload size={13} />
                      <span>انتخاب فایل فونت</span>
                      <input
                        type="file"
                        accept=".woff2,.woff,.ttf,.otf"
                        className="hidden"
                        onChange={handleFontFileUpload}
                      />
                    </label>
                  </div>

                  {form.customFontName && form.customFontDataUrl && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-200">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        <span>فونت اختصاصی فعال: <strong className="text-white">{form.customFontName.replace('UploadedFont_', '')}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCustomFont}
                        className="text-[10px] text-rose-300 hover:text-rose-200 hover:underline cursor-pointer"
                        title="حذف فونت آپلودشده"
                      >
                        حذف و بازگشت
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct WebFont URL input */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-300 block">یا وارد کردن آدرس مستقیم وب‌فونت (CSS URL):</label>
                  <input
                    type="text"
                    value={form.customFontCssUrl || ''}
                    onChange={(e) => {
                      const url = e.target.value;
                      setForm(prev => ({ ...prev, customFontCssUrl: url }));
                      if (url.trim()) injectCustomFontCssUrl(url);
                    }}
                    placeholder="https://fonts.googleapis.com/... یا لینک CDN"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono dir-ltr outline-none focus:border-purple-400"
                  />
                </div>

                {/* Preset Fonts List */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-300 block">فهرست فونت‌های فارسی آماده:</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {AVAILABLE_FONTS.map(font => {
                      const isSelected = form.siteFontFamily === font.id && !form.customFontName;
                      return (
                        <div
                          key={font.id}
                          onClick={() => setForm(prev => ({ ...prev, siteFontFamily: font.id, customFontName: undefined }))}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-purple-950/70 border-purple-400 text-purple-200 shadow-md'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold block">{font.label}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5 block" style={{ fontFamily: font.id }}>
                              {font.previewText}
                            </span>
                          </div>
                          {isSelected && <Check size={16} className="text-purple-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Animated Text Color */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>رنگ متن انیمیشنی (زیر آیکون):</span>
                  </label>
                  <span 
                    className="w-4 h-4 rounded-full border border-white/40 shadow"
                    style={{ backgroundColor: form.animatedTextColor || '#06b6d4' }}
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, animatedTextColor: c.hex }))}
                      className={`w-7 h-7 rounded-xl border transition-transform cursor-pointer ${c.class} ${
                        form.animatedTextColor === c.hex ? 'scale-125 border-white ring-2 ring-cyan-400' : 'border-transparent hover:scale-110'
                      }`}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.animatedTextColor || '#06b6d4'}
                    onChange={(e) => setForm(prev => ({ ...prev, animatedTextColor: e.target.value }))}
                    className="w-7 h-7 rounded-xl cursor-pointer bg-transparent border-0"
                    title="انتخاب رنگ دلخواه"
                  />
                </div>
              </div>

              {/* Titles Color */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <Palette size={14} className="text-amber-400" />
                    <span>رنگ عنوان‌ها و تیترهای صفحه:</span>
                  </label>
                  <span 
                    className="w-4 h-4 rounded-full border border-white/40 shadow"
                    style={{ backgroundColor: form.titleColor || '#ffffff' }}
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, titleColor: c.hex }))}
                      className={`w-7 h-7 rounded-xl border transition-transform cursor-pointer ${c.class} ${
                        form.titleColor === c.hex ? 'scale-125 border-white ring-2 ring-amber-400' : 'border-transparent hover:scale-110'
                      }`}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.titleColor || '#ffffff'}
                    onChange={(e) => setForm(prev => ({ ...prev, titleColor: e.target.value }))}
                    className="w-7 h-7 rounded-xl cursor-pointer bg-transparent border-0"
                    title="انتخاب رنگ دلخواه"
                  />
                </div>
              </div>

              {/* Body Text Color */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <Type size={14} className="text-slate-400" />
                    <span>رنگ متن‌های توضیحات و زیرنویس‌ها:</span>
                  </label>
                  <span 
                    className="w-4 h-4 rounded-full border border-white/40 shadow"
                    style={{ backgroundColor: form.siteTextColor || '#cbd5e1' }}
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, siteTextColor: c.hex }))}
                      className={`w-7 h-7 rounded-xl border transition-transform cursor-pointer ${c.class} ${
                        form.siteTextColor === c.hex ? 'scale-125 border-white ring-2 ring-blue-400' : 'border-transparent hover:scale-110'
                      }`}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.siteTextColor || '#cbd5e1'}
                    onChange={(e) => setForm(prev => ({ ...prev, siteTextColor: e.target.value }))}
                    className="w-7 h-7 rounded-xl cursor-pointer bg-transparent border-0"
                    title="انتخاب رنگ دلخواه"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: VIDEO TEASER (ویدئوی تیزر)                                          */}
          {/* ========================================================================= */}
          {sidebarTab === 'video' && (
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              <div className="p-3 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2">
                <span className="text-xs font-bold text-purple-300 block">فایل ویدیوی تیزر را انتخاب کنید:</span>
                <label className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow">
                  <Upload size={14} />
                  <span>آپلود فایل ویدیو</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </label>
                <input
                  type="text"
                  value={form.adVideoUrl || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, adVideoUrl: e.target.value }))}
                  placeholder="یا لینک ویدئو: https://.../video.mp4"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono dir-ltr mt-2"
                />
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={form.adVideoTitle || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, adVideoTitle: e.target.value }))}
                  placeholder="عنوان تیزر ویدئو..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={form.adVideoSubtitle || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, adVideoSubtitle: e.target.value }))}
                  placeholder="زیرنویس تیزر..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* LEFT: 100% REAL LIVE SITE SIMULATOR WITH DIRECT REORDER BUTTONS           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 bg-[#040816] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* Simulated Browser Bar */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="font-mono text-[11px] text-slate-300 ml-2 hidden sm:inline">
                https://warroom.ir (شبیه‌ساز زنده صفحه اصلی مسابقات)
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-cyan-400 font-bold">
                {previewDevice === 'desktop' ? 'نمای مانیتور' : previewDevice === 'tablet' ? 'نمای تبلت' : 'نمای موبایل'}
              </span>
            </div>
          </div>

          {/* Scrollable Simulator Body with 100% Real Components */}
          <div 
            className="p-3 sm:p-5 overflow-y-auto max-h-[82vh] bg-[#030610] text-slate-100 transition-all duration-300 no-scrollbar"
            style={{ 
              fontFamily: form.siteFontFamily || 'Vazirmatn, sans-serif',
              color: form.siteTextColor || '#cbd5e1'
            }}
          >
            <div 
              className={`mx-auto space-y-6 transition-all duration-300 ${
                previewDevice === 'mobile' 
                  ? 'max-w-[340px] border border-cyan-500/40 rounded-3xl p-3 bg-[#080d21]/90 shadow-2xl'
                  : previewDevice === 'tablet'
                    ? 'max-w-[620px]'
                    : 'w-full max-w-4xl'
              }`}
            >
              
              {/* Dynamic Sections rendering directly from the real components with direct up/down action handles */}
              {currentSectionsOrder.map((secKey, index) => {
                const meta = SECTION_METAS[secKey] || { name: secKey, desc: '' };
                const isFirst = index === 0;
                const isLast = index === currentSectionsOrder.length - 1;

                return (
                  <div 
                    key={secKey} 
                    className="relative group rounded-3xl p-1.5 transition-all duration-200 hover:bg-slate-900/30 border border-transparent hover:border-cyan-500/40"
                  >
                    {/* Direct Quick Reorder Bar on Top of each Section */}
                    <div className="flex items-center justify-between bg-slate-950/90 border border-cyan-500/40 rounded-xl px-3 py-1.5 mb-2 shadow-lg backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-cyan-950 border border-cyan-500/60 text-cyan-300 font-mono text-[10px] flex items-center justify-center font-black">
                          #{index + 1}
                        </span>
                        <span className="text-[11px] font-black text-cyan-200">{meta.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveSection(index, 'up')}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 ${
                            isFirst
                              ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                              : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-500/60 cursor-pointer active:scale-95'
                          }`}
                          title="انتقال این بخش به بالا"
                        >
                          <ArrowUp size={11} />
                          <span>به بالا</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveSection(index, 'down')}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 ${
                            isLast
                              ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                              : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-500/60 cursor-pointer active:scale-95'
                          }`}
                          title="انتقال این بخش به پایین"
                        >
                          <ArrowDown size={11} />
                          <span>به پایین</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSection(index)}
                          className="px-2 py-1 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/60 cursor-pointer active:scale-95"
                          title="حذف این بخش از صفحه اصلی"
                        >
                          <Trash2 size={11} />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>

                    {/* Actual Real Component */}
                    <div className="w-full">
                      {renderActualSection(secKey)}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default VisualSiteContentStudio;
