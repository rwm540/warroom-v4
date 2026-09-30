import React, { useState } from 'react';
import { 
  Sparkles, Video, Image as ImageIcon, Type, Layout, SlidersHorizontal, 
  Upload, Check, Play, Eye, RotateCcw, ArrowUp, ArrowDown, Plus, Trash2,
  Shield, Flame, Swords, Trophy, Compass, Flag, Target, Heart, Star, 
  Zap, Award, Bell, HelpCircle, Phone, Globe, Radio, ExternalLink,
  Monitor, Smartphone, Tablet, ChevronRight, Layers, FileVideo, Film,
  MessageCircle, Send, Info, Mail, MapPin, Clock, Edit3, MoveVertical,
  Palette, X, RefreshCw, CheckCircle2, ChevronDown, Move, CreditCard,
  Lock, Link as LinkIcon
} from 'lucide-react';
import { SiteSettings, PrizeItem } from '../../types';
import { injectCustomFontFace, injectCustomFontCssUrl } from '../../utils/dynamicFonts';
import AdventureHeroSection from '../home/AdventureHeroSection';
import PrizesAwardsBanner from '../home/PrizesAwardsBanner';
import SocialMessengersWidgets from '../home/SocialMessengersWidgets';
import AboutSection from '../home/AboutSection';
import Footer from '../home/Footer';

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
    homeSectionsOrder: siteSettings.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'],
    prizesSectionTitle: siteSettings.prizesSectionTitle !== undefined ? siteSettings.prizesSectionTitle : 'ویترین جایزه‌ها',
    prizesSectionSubtitle: siteSettings.prizesSectionSubtitle !== undefined ? siteSettings.prizesSectionSubtitle : 'کریستال جمع کن و جوایز ویژه سامانه را بازگشایی کن',
    baleChannelTitle: siteSettings.baleChannelTitle !== undefined ? siteSettings.baleChannelTitle : 'اخبار و اطلاعیه‌های رسمی اتاق جنگ',
    baleChannelSubtitle: siteSettings.baleChannelSubtitle !== undefined ? siteSettings.baleChannelSubtitle : 'اطلاعیه‌های فوری ستاد برگزاری، اعلام برندگان هفتگی و زمان‌بندی جوایز.',
    baleChannelUrl: siteSettings.baleChannelUrl || 'https://ble.ir/warroom_app',
    eitaaChannelTitle: siteSettings.eitaaChannelTitle !== undefined ? siteSettings.eitaaChannelTitle : 'روایت‌ها و پشت صحنه اتاق جنگ',
    eitaaChannelSubtitle: siteSettings.eitaaChannelSubtitle !== undefined ? siteSettings.eitaaChannelSubtitle : 'روایت‌های اختصاصی کارآگاهان، سرنخ‌های مخفی مراحل و چالش‌های ویژه روزانه.',
    eitaaChannelUrl: siteSettings.eitaaChannelUrl || 'https://eitaa.com/hisstory_official',
    aboutSectionTitle: siteSettings.aboutSectionTitle !== undefined ? siteSettings.aboutSectionTitle : 'درباره ما و پروژه اتاق جنگ',
    aboutSectionSubtitle: siteSettings.aboutSectionSubtitle !== undefined ? siteSettings.aboutSectionSubtitle : 'معرفی اهداف و رسالت سامانه',
    aboutSectionText: siteSettings.aboutSectionText !== undefined ? siteSettings.aboutSectionText : 'پلتفرم اتاق جنگ، سامانه جامع شبیه‌سازی تصمیم‌گیری استراتژیک، ارزیابی هوشمند و رقابت‌های گروهی دانش‌آموزی است که با هدف ارتقای آگاهی و تفکر تفکیکی طراحی گردیده است.',
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
  }));

  // Sidebar Tab state
  const [sidebarTab, setSidebarTab] = useState<'sections' | 'banners' | 'footer' | 'content' | 'style' | 'video'>('footer');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Section Metas for Reordering
  const SECTION_METAS: { [key: string]: { name: string; desc: string; icon: any } } = {
    hero: { name: 'بخش ۱: بنرهای ثبت‌نام، لوگو و تیزر', desc: 'لوگو، متن انیمیشنی، بنر دختران و پسران و پلیر تیزر', icon: Swords },
    prizes: { name: 'بخش ۲: ویترین جایزه‌ها و هدایا', desc: 'کارت‌های جوایز، عنوان و کریستال‌های مورد نیاز', icon: Trophy },
    messengers: { name: 'بخش ۳: کانال‌های بله و ایتا و راهنما', desc: 'لینک‌های بله و ایتا و دکمه‌های مراحل و راهنما', icon: MessageCircle },
    about: { name: 'بخش ۴: درباره ما و اهداف پروژه', desc: 'باکس معرفی و رسالت سامانه اتاق جنگ', icon: Info },
    footer: { name: 'بخش ۵: دبیرخانه، تلفن، درگاه و اینماد', desc: 'شماره تلفن، آیکون‌های درگاه و اینماد با لینک هدایت', icon: Phone },
  };

  const currentSectionsOrder = form.homeSectionsOrder || ['hero', 'prizes', 'messengers', 'about', 'footer'];

  // Handle reorder sections
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...currentSectionsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setForm(prev => ({
      ...prev,
      homeSectionsOrder: newOrder
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
              <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                نمای واقعی و دقیق سایت
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
          
          {/* Sidebar Nav Tabs */}
          <div className="grid grid-cols-6 gap-1 pb-2 border-b border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => setSidebarTab('footer')}
              className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'footer'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
              title="آیکون‌ها، درگاه پرداخت و نماد اینماد با لینک هدایت"
            >
              <CreditCard size={15} className="text-cyan-400" />
              <span>فوتر و نمادها</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('banners')}
              className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'banners'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
              title="بنرها و چینش تک‌لاینی/دو‌لاینی"
            >
              <Layout size={15} className="text-amber-400" />
              <span>بنرها</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('sections')}
              className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'sections'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
              title="ترتیب و جابه‌جایی بخش‌ها"
            >
              <MoveVertical size={15} className="text-emerald-400" />
              <span>ترتیب</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('content')}
              className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'content'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
              title="ویرایش و حذف متن‌ها"
            >
              <Type size={15} className="text-blue-400" />
              <span>متن‌ها</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('style')}
              className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'style'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
              title="فونت و رنگ متن‌ها"
            >
              <Palette size={15} className="text-purple-400" />
              <span>فونت/رنگ</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('video')}
              className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
                sidebarTab === 'video'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
              title="ویدئوی تیزر مسابقه"
            >
              <Film size={15} className="text-rose-400" />
              <span>ویدئو</span>
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

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: SECTIONS REORDERING (ترتیب و جابه‌جایی بخش‌ها)                       */}
          {/* ========================================================================= */}
          {sidebarTab === 'sections' && (
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 leading-relaxed">
                🚀 برای تغییر ترتیب بخش‌ها در صفحه اصلی، از دکمه‌های <strong>بالا</strong> و <strong>پایین</strong> استفاده کنید:
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
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 font-mono text-xs font-black shrink-0">
                          {index + 1}
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
          {/* TAB: TEXTS & CLEARABLE CONTENT (ویرایش و پاک کردن متن‌ها)                */}
          {/* ========================================================================= */}
          {sidebarTab === 'content' && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar pt-1">
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 leading-relaxed">
                💡 نکته: هر متنی را که نمی‌خواهید نمایش داده شود، می‌توانید با دکمه <Trash2 size={12} className="inline text-rose-400 mx-0.5" /> پاک کنید تا در سایت مخفی شود.
              </div>

              {/* 1. Animated Typing Text */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-cyan-300 flex items-center gap-1">
                    <Sparkles size={13} />
                    <span>متن نوشتاری انیمیشنی (زیر لوگو):</span>
                  </label>
                  {form.iconAnimatedText && (
                    <button
                      type="button"
                      onClick={() => handleClearField('iconAnimatedText')}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="پاک کردن متن و مخفی‌سازی"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form.iconAnimatedText || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, iconAnimatedText: e.target.value }))}
                  placeholder="متن تایپی متحرک را بنویسید یا خالی بگذارید..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              {/* 2. Subtext Below Icon */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">متن تکمیلی و زیرنویس زیر لوگو:</label>
                  {form.pageIconSubtext && (
                    <button
                      type="button"
                      onClick={() => handleClearField('pageIconSubtext')}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="پاک کردن"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form.pageIconSubtext || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, pageIconSubtext: e.target.value }))}
                  placeholder="زیرنویس کوتاه..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              {/* 3. Prizes Section Titles */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300">عنوان و زیرنویس ویترین جوایز:</label>
                  {form.prizesSectionTitle && (
                    <button
                      type="button"
                      onClick={() => handleClearField('prizesSectionTitle')}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="پاک کردن عنوان"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form.prizesSectionTitle || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, prizesSectionTitle: e.target.value }))}
                  placeholder="عنوان بخش جوایز..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400 mb-1.5"
                />
                <input
                  type="text"
                  value={form.prizesSectionSubtitle || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, prizesSectionSubtitle: e.target.value }))}
                  placeholder="زیرنویس بخش جوایز..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              {/* 4. Messengers Titles */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-blue-300 block">عنوان کانال‌های بله و ایتا:</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={form.baleChannelTitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, baleChannelTitle: e.target.value }))}
                    placeholder="عنوان کانال بله..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={form.eitaaChannelTitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, eitaaChannelTitle: e.target.value }))}
                    placeholder="عنوان کانال ایتا..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* 5. About Us Text */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-300">متن درباره ما و رسالت سامانه:</label>
                  {form.aboutSectionText && (
                    <button
                      type="button"
                      onClick={() => handleClearField('aboutSectionText')}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="پاک کردن متن"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={form.aboutSectionText || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, aboutSectionText: e.target.value }))}
                  placeholder="متن توضیحی درباره ما..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-400 leading-relaxed"
                />
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
