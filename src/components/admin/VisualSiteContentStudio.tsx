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
    homeSectionsOrder: siteSettings.homeSectionsOrder || ['hero', 'timer', 'prizes', 'messengers', 'about', 'footer'],
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
    customFooterBadges: siteSettings.customFooterBadges || [],
    copyrightText: siteSettings.copyrightText || '',
    showCountdownTimer: siteSettings.showCountdownTimer !== undefined ? siteSettings.showCountdownTimer : true,
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
  const [sidebarTab, setSidebarTab] = useState<'prizes' | 'messengers' | 'about' | 'banners' | 'footer' | 'sections' | 'style' | 'video'>('prizes');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Section Metas for Reordering
  const SECTION_METAS: { [key: string]: { name: string; desc: string; icon: any } } = {
    hero: { name: 'بخش ۱: بنرهای ثبت‌نام، لوگو و تیزر', desc: 'لوگو، متن انیمیشنی، بنر دختران و پسران و پلیر تیزر', icon: Swords },
    timer: { name: 'بخش ۲: شمارش معکوس مسابقات (تایمر)', desc: 'کارت زمان‌سنج زنده رویداد با قابلیت جابه‌جایی در کل صفحه', icon: Clock },
    prizes: { name: 'بخش ۳: ویترین جایزه‌ها و هدایا', desc: 'کارت‌های جوایز، عنوان و کریستال‌های مورد نیاز', icon: Trophy },
    messengers: { name: 'بخش ۴: کانال‌های بله و ایتا و راهنما', desc: 'لینک‌های بله و ایتا و دکمه‌های مراحل و راهنما', icon: MessageCircle },
    about: { name: 'بخش ۵: درباره ما و اهداف پروژه', desc: 'باکس معرفی و رسالت سامانه اتاق جنگ', icon: Info },
    footer: { name: 'بخش ۶: دبیرخانه، تلفن، درگاه و اینماد', desc: 'شماره تلفن، آیکون‌های درگاه و اینماد با لینک هدایت', icon: Phone },
  };

  const currentSectionsOrder = (() => {
    const list = form.homeSectionsOrder || ['hero', 'timer', 'prizes', 'messengers', 'about', 'footer'];
    if (list.includes('timer')) return list;
    if (form.countdownPosition === 'top') return ['timer', ...list];
    if (form.countdownPosition === 'bottom') return [...list.filter(s => s !== 'footer'), 'timer', 'footer'];
    return ['hero', 'timer', ...list.filter(s => s !== 'hero')];
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
    switch (secKey) {
      case 'hero':
        return (
          <AdventureHeroSection 
            themeMode="boys"
            currentUser={null}
            siteSettings={form}
            onOpenRegister={() => {}}
            onSelectTheme={() => {}}
            onGoToDashboard={() => {}}
          />
        );
      case 'timer':
        return form.showCountdownTimer !== false ? (
          <div className="w-full max-w-xl mx-auto my-3 px-2">
            <CountdownTimerCard 
              themeMode="boys"
              countdownTitle={form.countdownTitle}
              countdownString={form.heroCountdown}
              targetDate={form.countdownTargetDate}
              countdownStyle={form.countdownStyle}
              removeBorder={form.removeTimerBorder !== false}
            />
          </div>
        ) : null;
      case 'prizes':
        return (
          <PrizesAwardsBanner 
            themeMode="boys"
            prizes={prizes}
            siteSettings={form}
            onExplorePrizes={() => {}}
          />
        );
      case 'messengers':
        return (
          <SocialMessengersWidgets 
            themeMode="boys"
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
            themeMode="boys"
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
          
          {/* Sidebar Nav Tabs (8 Comprehensive Sections) */}
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5 pb-2 border-b border-slate-800/80 text-center">
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

            {/* 4. بنرها و تایمر */}
            <button
              type="button"
              onClick={() => setSidebarTab('banners')}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'banners'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800/60 hover:border-slate-700'
              }`}
              title="بنرهای ثبت‌نام، لوگو، متن تایپی و تایمر معکوس"
            >
              <Layout size={16} className="text-cyan-400" />
              <span>بنرها و تایمر</span>
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

              {/* 🌟 2. ENAMAD / TRUST SEAL ICON & REDIRECT LINK (اینماد و نماد اعتماد) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-500/40">
                      <CheckCircle2 size={14} />
                    </div>
                    <span className="text-xs font-black text-amber-300">آیکون و لینک نماد اعتماد (اینماد):</span>
                  </div>
                  {form.enamadTitle && (
                    <button
                      type="button"
                      onClick={() => handleClearField('enamadTitle')}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded transition"
                      title="مخفی‌سازی اینماد"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Enamad Icon Preview & Direct Upload */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center shrink-0 overflow-hidden shadow">
                    {form.enamadIconUrl ? (
                      <img src={form.enamadIconUrl} alt="اینماد" className="w-full h-full object-contain p-1" />
                    ) : (
                      <CheckCircle2 size={24} className="text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">آیکون فعلی اینماد</span>
                      {form.enamadIconUrl && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, enamadIconUrl: '' }))}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          حذف عکس
                        </button>
                      )}
                    </div>
                    <label className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-[11px] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-95 transition">
                      <Upload size={12} />
                      <span>آپلود آیکون اینماد (عکس)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload('enamadIconUrl', e)}
                      />
                    </label>
                  </div>
                </div>

                {/* Enamad Title & Subtitle */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">عنوان اینماد یا مجوز:</label>
                  <input
                    type="text"
                    value={form.enamadTitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, enamadTitle: e.target.value }))}
                    placeholder="نماد اعتماد الکترونیکی"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    value={form.enamadSubtitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, enamadSubtitle: e.target.value }))}
                    placeholder="وزارت صنعت، معدن و تجارت"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
                  />
                </div>

                {/* 🔗 Enamad Redirect Link Input */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                      <LinkIcon size={12} />
                      <span>لینک هدایت هنگام کلیک روی اینماد:</span>
                    </label>
                    {form.enamadLinkUrl && (
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                        لینک فعال
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={form.enamadLinkUrl || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, enamadLinkUrl: e.target.value }))}
                    placeholder="https://trustseal.enamad.ir/?id=... یا لینک پروفایل اینماد"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono dir-ltr outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    کاربر با کلیک روی نماد اینماد در فوتر، به این آدرس هدایت خواهد شد.
                  </p>
                </div>

                {/* Quick Presets for Enamad */}
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

                  {/* Toggle 4: Remove Timer Border (حذف بردر کادر تایمر) */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border-0 cursor-pointer hover:bg-slate-850 transition">
                    <input
                      type="checkbox"
                      checked={form.removeTimerBorder !== false}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, removeTimerBorder: e.target.checked }));
                        if (triggerAlert) {
                          triggerAlert(e.target.checked 
                            ? 'بردر کادر تایمر کاملاً برداشته شد.' 
                            : 'بردر کادر تایمر فعال شد.');
                        }
                      }}
                      className="w-4 h-4 mt-0.5 accent-cyan-500 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">برداشتن کامل بردر و خط کادر تایمر (همیشه بدون بردر)</span>
                      <span className="text-[10px] text-slate-400 leading-relaxed block mt-0.5">
                        کادر تایمر بدون هیچ خط بردر و حاشیه بیرونی، با هاله و پس‌زمینه شفاف نمایش می‌یابد.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* ⏱️ COUNTDOWN TIMER CONTROLS (تنظیمات سه‌گزینه‌ای تایمر با گزینه‌های options و جابه‌جایی در صفحه) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border-0 space-y-3.5 shadow-xl">
                
                {/* Header with Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-cyan-950 text-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                      <Clock size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-cyan-300 block">شمارش معکوس رویداد و مسابقات:</span>
                      <span className="text-[10px] text-slate-400">جابه‌جایی آسان با درگ و دراپ (Drag & Drop) یا گزینه‌ها</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-xl border-0 hover:text-white transition">
                    <input
                      type="checkbox"
                      checked={form.showCountdownTimer !== false}
                      onChange={(e) => setForm(prev => ({ ...prev, showCountdownTimer: e.target.checked }))}
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                    />
                    <span>{form.showCountdownTimer !== false ? 'فعال و نمایان' : 'مخفی'}</span>
                  </label>
                </div>

                {form.showCountdownTimer !== false && (
                  <div className="space-y-3.5 pt-2 border-t border-slate-800/80">
                    
                    {/* ⠿ DRAG AND DROP ARENA (جابه‌جایی تایمر به صورت درگ و اند دراپ) */}
                    <div className="p-3 rounded-2xl bg-cyan-950/20 border-0 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-cyan-300 flex items-center gap-1.5">
                          <GripVertical size={14} />
                          <span>جابه‌جایی تایمر با درگ و اند دراپ (Drag & Drop):</span>
                        </label>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 font-bold border-0">
                          {form.countdownPosition === 'top' ? 'بالای صفحه' : form.countdownPosition === 'bottom' ? 'پایین صفحه' : 'میانه صفحه'}
                        </span>
                      </div>

                      {/* 1. Draggable Item */}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', 'timer');
                          e.dataTransfer.effectAllowed = 'move';
                          setIsDraggingTimer(true);
                        }}
                        onDragEnd={() => setIsDraggingTimer(false)}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-0 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all flex items-center justify-between shadow-lg select-none"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                            <GripVertical size={15} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-white block">آیتم تایمر (بکشید و رها کنید)</span>
                            <span className="text-[9px] text-cyan-300/80">برای جابه‌جایی، این کادر را به یکی از ۳ ناحیه زیر بکشید</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-cyan-900 text-cyan-200 px-2 py-0.5 rounded-md font-bold">
                          درگ کنید ⠿
                        </span>
                      </div>

                      {/* 2. Three Interactive Drop Zones */}
                      <div className="grid grid-cols-1 gap-1.5 pt-1">
                        
                        {/* Drop Zone: Top */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const current = form.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'];
                            const filtered = current.filter(s => s !== 'timer');
                            const newOrder = ['timer', ...filtered];
                            setForm(prev => ({ ...prev, countdownPosition: 'top', homeSectionsOrder: newOrder }));
                            setIsDraggingTimer(false);
                            if (triggerAlert) triggerAlert('تایمر با درگ و دراپ به بالای صفحه منتقل شد.');
                          }}
                          onClick={() => {
                            const current = form.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'];
                            const filtered = current.filter(s => s !== 'timer');
                            setForm(prev => ({ ...prev, countdownPosition: 'top', homeSectionsOrder: ['timer', ...filtered] }));
                            if (triggerAlert) triggerAlert('موقعیت: بالای صفحه');
                          }}
                          className={`p-2.5 rounded-xl border-2 border-dashed transition-all flex items-center justify-between cursor-pointer ${
                            form.countdownPosition === 'top'
                              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : isDraggingTimer
                              ? 'bg-cyan-950/40 border-cyan-400 animate-pulse text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowUp size={13} className="text-cyan-400" />
                            <span className="text-xs font-bold">ناحیه ۱: بالای صفحه (پیش از بنرها)</span>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold border-0 ${
                            form.countdownPosition === 'top'
                              ? 'bg-cyan-900 text-cyan-200'
                              : 'bg-slate-950 text-slate-400'
                          }`}>
                            {form.countdownPosition === 'top' ? 'محل فعال ✓' : 'Drop Here'}
                          </span>
                        </div>

                        {/* Drop Zone: Middle */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const current = form.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'];
                            const filtered = current.filter(s => s !== 'timer');
                            const heroIdx = filtered.indexOf('hero');
                            const newOrder = [...filtered];
                            newOrder.splice(heroIdx + 1, 0, 'timer');
                            setForm(prev => ({ ...prev, countdownPosition: 'middle', homeSectionsOrder: newOrder }));
                            setIsDraggingTimer(false);
                            if (triggerAlert) triggerAlert('تایمر با درگ و دراپ به میانه صفحه منتقل شد.');
                          }}
                          onClick={() => {
                            const current = form.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'];
                            const filtered = current.filter(s => s !== 'timer');
                            const heroIdx = filtered.indexOf('hero');
                            const newOrder = [...filtered];
                            newOrder.splice(heroIdx + 1, 0, 'timer');
                            setForm(prev => ({ ...prev, countdownPosition: 'middle', homeSectionsOrder: newOrder }));
                            if (triggerAlert) triggerAlert('موقعیت: میانه صفحه');
                          }}
                          className={`p-2.5 rounded-xl border-2 border-dashed transition-all flex items-center justify-between cursor-pointer ${
                            (form.countdownPosition === 'middle' || !form.countdownPosition)
                              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : isDraggingTimer
                              ? 'bg-cyan-950/40 border-cyan-400 animate-pulse text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MoveVertical size={13} className="text-cyan-400" />
                            <span className="text-xs font-bold">ناحیه ۲: میانه صفحه (زیر بنرها)</span>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold border-0 ${
                            (form.countdownPosition === 'middle' || !form.countdownPosition)
                              ? 'bg-cyan-950 text-cyan-200'
                              : 'bg-slate-950 text-slate-400'
                          }`}>
                            {(form.countdownPosition === 'middle' || !form.countdownPosition) ? 'محل فعال ✓' : 'Drop Here'}
                          </span>
                        </div>

                        {/* Drop Zone: Bottom */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const current = form.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'];
                            const filtered = current.filter(s => s !== 'timer' && s !== 'footer');
                            const newOrder = [...filtered, 'timer', 'footer'];
                            setForm(prev => ({ ...prev, countdownPosition: 'bottom', homeSectionsOrder: newOrder }));
                            setIsDraggingTimer(false);
                            if (triggerAlert) triggerAlert('تایمر با درگ و دراپ به انتهای صفحه منتقل شد.');
                          }}
                          onClick={() => {
                            const current = form.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'];
                            const filtered = current.filter(s => s !== 'timer' && s !== 'footer');
                            const newOrder = [...filtered, 'timer', 'footer'];
                            setForm(prev => ({ ...prev, countdownPosition: 'bottom', homeSectionsOrder: newOrder }));
                            if (triggerAlert) triggerAlert('موقعیت: انتهای صفحه');
                          }}
                          className={`p-2.5 rounded-xl border-2 border-dashed transition-all flex items-center justify-between cursor-pointer ${
                            form.countdownPosition === 'bottom'
                              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : isDraggingTimer
                              ? 'bg-cyan-950/40 border-cyan-400 animate-pulse text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowDown size={13} className="text-cyan-400" />
                            <span className="text-xs font-bold">ناحیه ۳: انتهای صفحه (بالای فوتر)</span>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold border-0 ${
                            form.countdownPosition === 'bottom'
                              ? 'bg-cyan-900 text-cyan-200'
                              : 'bg-slate-950 text-slate-400'
                          }`}>
                            {form.countdownPosition === 'bottom' ? 'محل فعال ✓' : 'Drop Here'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 🌟 1. POSITION SELECTION - 3 OPTIONS DROPDOWN (منوی کشویی سه گزینه‌ای options برای جابه‌جایی تایمر در هر جای صفحه) */}
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-cyan-300 flex items-center gap-1.5">
                          <SlidersHorizontal size={13} />
                          <span>موقعیت قرارگیری در صفحه (سه گزینه‌ای):</span>
                        </label>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-bold">
                          {form.countdownPosition === 'top' ? 'بالای صفحه' : form.countdownPosition === 'bottom' ? 'پایین صفحه' : 'میانه صفحه'}
                        </span>
                      </div>

                      {/* Select Dropdown with 3 options */}
                      <select
                        value={form.countdownPosition || 'middle'}
                        onChange={(e) => {
                          const val = e.target.value as 'top' | 'middle' | 'bottom';
                          setForm(prev => ({ ...prev, countdownPosition: val }));
                          const posNames = {
                            top: 'بالای صفحه (پیش از بنرها)',
                            middle: 'میانه صفحه (زیر بنرها)',
                            bottom: 'انتهای صفحه (بالای فوتر)'
                          };
                          if (triggerAlert) triggerAlert(`تایمر معکوس به «${posNames[val]}» منتقل شد.`);
                        }}
                        className="w-full bg-slate-900 border border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-cyan-200 font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
                      >
                        <option value="top">گزینه ۱: بالای صفحه (بالای بنرهای ثبت‌نام / زیر تیتر اصلی)</option>
                        <option value="middle">گزینه ۲: میانه صفحه (زیر بنرها / بین بنرها و سایر بخش‌ها)</option>
                        <option value="bottom">گزینه ۳: انتهای صفحه (پایین صفحه / بالای فوتر و نمادها)</option>
                      </select>

                      {/* 3 Interactive Quick-Move Visual Option Cards */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, countdownPosition: 'top' }));
                            if (triggerAlert) triggerAlert('تایمر به گزینه ۱ (بالای صفحه) منتقل شد.');
                          }}
                          className={`p-2 rounded-xl text-center border transition flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                            form.countdownPosition === 'top'
                              ? 'bg-gradient-to-b from-cyan-900/60 to-cyan-950 border-cyan-400 text-cyan-200 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-[1.02]'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-500/40">
                            <ArrowUp size={11} />
                          </div>
                          <span className="text-[10px] font-black">گزینه ۱</span>
                          <span className="text-[9px]">بالای بنرها</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, countdownPosition: 'middle' }));
                            if (triggerAlert) triggerAlert('تایمر به گزینه ۲ (میانه صفحه) منتقل شد.');
                          }}
                          className={`p-2 rounded-xl text-center border transition flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                            form.countdownPosition === 'middle' || !form.countdownPosition
                              ? 'bg-gradient-to-b from-cyan-900/60 to-cyan-950 border-cyan-400 text-cyan-200 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-[1.02]'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-500/40">
                            <MoveVertical size={11} />
                          </div>
                          <span className="text-[10px] font-black">گزینه ۲</span>
                          <span className="text-[9px]">زیر بنرها</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, countdownPosition: 'bottom' }));
                            if (triggerAlert) triggerAlert('تایمر به گزینه ۳ (پایین صفحه) منتقل شد.');
                          }}
                          className={`p-2 rounded-xl text-center border transition flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                            form.countdownPosition === 'bottom'
                              ? 'bg-gradient-to-b from-cyan-900/60 to-cyan-950 border-cyan-400 text-cyan-200 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-[1.02]'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-500/40">
                            <ArrowDown size={11} />
                          </div>
                          <span className="text-[10px] font-black">گزینه ۳</span>
                          <span className="text-[9px]">پایین صفحه</span>
                        </button>
                      </div>

                      {/* Helper button to jump to sections reorder tab */}
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarTab('sections');
                          // ensure timer is in sections order if user wants full free drag/reorder
                          if (!currentSectionsOrder.includes('timer')) {
                            setForm(prev => ({
                              ...prev,
                              homeSectionsOrder: ['hero', 'timer', ...(prev.homeSectionsOrder || ['prizes', 'messengers', 'about', 'footer']).filter(s => s !== 'hero')]
                            }));
                          }
                          if (triggerAlert) triggerAlert('بخش تایمر در تب «ترتیب» قرار گرفت؛ می‌توانید آن را با فلش‌ها بالا و پایین ببرید.');
                        }}
                        className="w-full mt-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-cyan-300 hover:text-cyan-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 border border-slate-800 transition cursor-pointer"
                      >
                        <Move size={12} />
                        <span>جابه‌جایی آزاد بین همه بخش‌ها در تب «ترتیب»</span>
                      </button>
                    </div>

                    {/* 🌟 2. STYLE SELECTION - 3 OPTIONS (طرح و استایل سه گزینه‌ای) */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        استایل و طرح نمایشی تایمر (سه گزینه‌ای):
                      </label>
                      <select
                        value={form.countdownStyle || 'tactical'}
                        onChange={(e) => {
                          const s = e.target.value as 'tactical' | 'compact' | 'neon';
                          setForm(prev => ({ ...prev, countdownStyle: s }));
                          if (triggerAlert) triggerAlert('استایل تایمر تغییر یافت.');
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400 cursor-pointer mb-2"
                      >
                        <option value="tactical">گزینه ۱: کارت شیشه‌ای تاکتیکال مدرن (کامل با بافت تیره)</option>
                        <option value="compact">گزینه ۲: نوار افقی باریک و فشرده (کم‌حجم و ساده)</option>
                        <option value="neon">گزینه ۳: کادرهای نئونی سایبرپانکی (درخشان با افکت الکتریکی)</option>
                      </select>

                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'tactical', label: 'تاکتیکال', desc: 'شیشه‌ای' },
                          { id: 'compact', label: 'فشرده', desc: 'نوار باریک' },
                          { id: 'neon', label: 'نئونی', desc: 'سایبرپانکی' },
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, countdownStyle: st.id as any }));
                              if (triggerAlert) triggerAlert(`طرح «${st.label}» اعمال شد.`);
                            }}
                            className={`p-1.5 rounded-lg text-center border text-[10px] transition cursor-pointer ${
                              (form.countdownStyle || 'tactical') === st.id
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="block font-bold">{st.label}</span>
                            <span className="text-[8px] opacity-70">{st.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 🌟 3. TITLE & COUNTDOWN DURATION INPUT (عنوان و زمان شمارش معکوس) */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">عنوان بالای تایمر:</label>
                      <input
                        type="text"
                        value={form.countdownTitle || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, countdownTitle: e.target.value }))}
                        placeholder="مهلت ثبت‌نام و آغاز رویداد بزرگ اتاق جنگ"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-300">
                          زمان شمارش معکوس (روز : ساعت : دقیقه : ثانیه):
                        </label>
                      </div>

                      {/* Duration Presets Select (سه گزینه‌ای به صورت options) */}
                      <div className="space-y-1.5">
                        <select
                          value={
                            form.heroCountdown === '۰۲:۱۴:۳۹:۱۵' || form.heroCountdown === '02:14:39:15'
                              ? 'opt1'
                              : form.heroCountdown === '۰۷:۰۰:۰۰:۰۰' || form.heroCountdown === '07:00:00:00'
                              ? 'opt2'
                              : form.heroCountdown === '۳۰:۰۰:۰۰:۰۰' || form.heroCountdown === '30:00:00:00'
                              ? 'opt3'
                              : 'custom'
                          }
                          onChange={(e) => {
                            const map: Record<string, string> = {
                              opt1: '۰۲:۱۴:۳۹:۱۵',
                              opt2: '۰۷:۰۰:۰۰:۰۰',
                              opt3: '۳۰:۰۰:۰۰:۰۰',
                            };
                            if (map[e.target.value]) {
                              setForm(prev => ({ ...prev, heroCountdown: map[e.target.value] }));
                              if (triggerAlert) triggerAlert('زمان تایمر به‌روزرسانی شد.');
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-bold outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          <option value="opt1">گزینه ۱: ۲ روز و ۱۴ ساعت (پیش‌فرض رویداد)</option>
                          <option value="opt2">گزینه ۲: ۱ هفته (۷ روز کامل)</option>
                          <option value="opt3">گزینه ۳: ۱ ماه (۳۰ روز کامل)</option>
                          <option value="custom">گزینه دستی و دلخواه...</option>
                        </select>

                        <input
                          type="text"
                          value={form.heroCountdown || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, heroCountdown: e.target.value }))}
                          placeholder="مثلاً: ۰۲:۱۴:۳۹:۱۵"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono dir-ltr outline-none focus:border-cyan-400"
                        />
                      </div>
                      
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        می‌توانید زمان را به فرمت <code className="text-cyan-400">02:14:39:15</code> (روز:ساعت:دقیقه:ثانیه) وارد کنید تا ثانیه‌شمار زنده آن شروع به شمارش معکوس کند.
                      </p>
                    </div>

                    {/* Quick Extension & Duration Presets (دکمه‌های تمدید سریع زمان و بازگشت بنرها) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold">
                        <span>تمدید سریع زمان رویداد:</span>
                        <span className="text-[9px] text-emerald-400">با تمدید، بنرها مجدداً ظاهر می‌شوند ✓</span>
                      </div>
                      
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ 
                              ...prev, 
                              heroCountdown: '۰۲:۱۴:۳۹:۱۵',
                              showCountdownTimer: true,
                              disableBannerLinks: false,
                              hideRegistrationBanners: false
                            }));
                            if (triggerAlert) triggerAlert('تایمر تمدید شد (۲ روز و ۱۴ ساعت) و بنرهای ثبت‌نام مجدداً نمایان شدند.');
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border-0 transition active:scale-95 cursor-pointer ${
                            form.heroCountdown === '۰۲:۱۴:۳۹:۱۵'
                              ? 'bg-cyan-900 text-cyan-200 shadow-md'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          تمدید ۲ روز
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ 
                              ...prev, 
                              heroCountdown: '۰۷:۰۰:۰۰:۰۰',
                              showCountdownTimer: true,
                              disableBannerLinks: false,
                              hideRegistrationBanners: false
                            }));
                            if (triggerAlert) triggerAlert('تایمر تمدید شد (۷ روز کامل) و بنرهای ثبت‌نام مجدداً نمایان شدند.');
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border-0 transition active:scale-95 cursor-pointer ${
                            form.heroCountdown === '۰۷:۰۰:۰۰:۰۰'
                              ? 'bg-cyan-900 text-cyan-200 shadow-md'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          تمدید ۷ روز
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ 
                              ...prev, 
                              heroCountdown: '۳۰:۰۰:۰۰:۰۰',
                              showCountdownTimer: true,
                              disableBannerLinks: false,
                              hideRegistrationBanners: false
                            }));
                            if (triggerAlert) triggerAlert('تایمر تمدید شد (۳۰ روز کامل) و بنرهای ثبت‌نام مجدداً نمایان شدند.');
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border-0 transition active:scale-95 cursor-pointer ${
                            form.heroCountdown === '۳۰:۰۰:۰۰:۰۰'
                              ? 'bg-cyan-900 text-cyan-200 shadow-md'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          تمدید ۳۰ روز
                        </button>
                      </div>
                    </div>

                  </div>
                )}
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

              {/* Add Timer to Sections Order if not already present */}
              {!currentSectionsOrder.includes('timer') && (
                <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-2 mt-3">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-cyan-400" />
                    <span className="text-xs font-black text-cyan-200">جابه‌جایی تایمر بین تمام بخش‌های صفحه:</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    می‌توانید تایمر را به عنوان یک سکشن مستقل به این لیست اضافه کنید تا با فلش‌های بالا و پایین در هر نقطه‌ای از صفحه (بالاتر از جوایز، زیر پیام‌رسان‌ها یا بالای فوتر) قرار گیرد.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        homeSectionsOrder: ['hero', 'timer', ...(prev.homeSectionsOrder || ['prizes', 'messengers', 'about', 'footer']).filter(s => s !== 'hero')]
                      }));
                      if (triggerAlert) triggerAlert('سکشن شمارش معکوس به لیست افزوده شد و اکنون می‌توانید آن را به هر جای صفحه منتقل کنید.');
                    }}
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow active:scale-95 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>افزودن تایمر به لیست جهت جابه‌جایی آزاد</span>
                  </button>
                </div>
              )}
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
                      </div>
                    </div>

                    {/* Render countdown timer above footer in preview if position is bottom and timer is not in custom order */}
                    {secKey === 'footer' && 
                     form.showCountdownTimer !== false && 
                     form.countdownPosition === 'bottom' && 
                     !currentSectionsOrder.includes('timer') && (
                      <div className="w-full mb-3">
                        {renderActualSection('timer')}
                      </div>
                    )}

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
