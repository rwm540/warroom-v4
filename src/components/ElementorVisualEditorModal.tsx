import React, { useState } from 'react';
import { 
  X, Check, Eye, EyeOff, ArrowUp, ArrowDown, Trash2, Plus, 
  Monitor, Tablet, Smartphone, Sparkles, Layout, SlidersHorizontal, 
  Video, Trophy, BarChart2, HelpCircle, MessageSquare, Info, 
  FileText, Image as ImageIcon, Palette, RotateCcw, Copy, ExternalLink, Play
} from 'lucide-react';
import { SiteSettings, HomePageBlock, HomePageBlockType, User } from '../types';
import { HomeAnnouncement, HomeStats, FaqItem, defaultHomeBlocks } from '../data/home';
import AdventureHeroSection from './home/AdventureHeroSection';
import PrizesAwardsBanner from './home/PrizesAwardsBanner';
import AboutSection from './home/AboutSection';
import StatsStrip from './home/StatsStrip';
import SocialMessengersWidgets from './home/SocialMessengersWidgets';
import { confirmInternal } from '../lib/appDialog';

interface ElementorVisualEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSettings: SiteSettings;
  onSaveSiteSettings: (updated: SiteSettings) => void;
  homeAnnouncements: HomeAnnouncement[];
  homeStats: HomeStats;
  faqs: FaqItem[];
  currentUser: User | null;
  onNavigateToTab?: (tab: string) => void;
}

export default function ElementorVisualEditorModal({
  isOpen,
  onClose,
  siteSettings,
  onSaveSiteSettings,
  homeAnnouncements,
  homeStats,
  faqs,
  currentUser,
  onNavigateToTab
}: ElementorVisualEditorModalProps) {
  if (!isOpen) return null;

  // Local state for the blocks being edited in the Elementor session
  const [blocks, setBlocks] = useState<HomePageBlock[]>(() => {
    if (siteSettings.homeBlocks && siteSettings.homeBlocks.length > 0) {
      return JSON.parse(JSON.stringify(siteSettings.homeBlocks));
    }
    return JSON.parse(JSON.stringify(defaultHomeBlocks));
  });

  // Local state for site branding/settings in session
  const [localSettings, setLocalSettings] = useState<SiteSettings>(() => ({ ...siteSettings }));

  // Selected block for Inspector panel
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id || null);

  // Active Sidebar Tab: 'blocks' | 'widgets' | 'inspector' | 'styles'
  const [activeSidebarTab, setActiveSidebarTab] = useState<'blocks' | 'widgets' | 'inspector' | 'styles'>('blocks');

  // Device mode: 'desktop' | 'tablet' | 'mobile'
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Notification toast inside editor
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  // Block Move Handlers
  const handleMoveUp = (id: string) => {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(b => b.id === id);
    if (index <= 0) return;

    const temp = sorted[index].order;
    sorted[index].order = sorted[index - 1].order;
    sorted[index - 1].order = temp;

    setBlocks(sorted);
    showToast('ترتیب بخش به‌روزرسانی شد');
  };

  const handleMoveDown = (id: string) => {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(b => b.id === id);
    if (index < 0 || index >= sorted.length - 1) return;

    const temp = sorted[index].order;
    sorted[index].order = sorted[index + 1].order;
    sorted[index + 1].order = temp;

    setBlocks(sorted);
    showToast('ترتیب بخش به‌روزرسانی شد');
  };

  const handleToggleVisibility = (id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, isVisible: !b.isVisible } : b));
    showToast('وضعیت نمایش بخش تغییر یافت');
  };

  const handleDeleteBlock = (id: string) => {
    if (blocks.length <= 1) {
      showToast('حداقل یک بخش باید در صفحه وجود داشته باشد');
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
    showToast('بخش با موفقیت حذف شد');
  };

  const handleAddWidget = (type: HomePageBlockType) => {
    const maxOrder = Math.max(...blocks.map(b => b.order), 0);
    let title = 'ویجت جدید';
    let subtitle = '';

    switch (type) {
      case 'video_player':
        title = 'ویدئوی اختصاصی معرفی قرارگاه';
        subtitle = 'تیزر رسمی مسابقات و مأموریت‌ها';
        break;
      case 'custom_banner':
        title = 'بنر پیام ویژه و فراخوان مهم';
        subtitle = 'اطلاعیه سفارشی با دکمه اقدام فوری';
        break;
      case 'prizes_awards':
        title = 'بخش جوایز و هدایای مسابقه';
        subtitle = 'لیست کریستال‌ها و جوایز ویژه';
        break;
      case 'stats_strip':
        title = 'آمار و ارقام زنده قرارگاه';
        subtitle = 'دستاوردهای عملیاتی رزمندگان';
        break;
      case 'action_buttons':
        title = 'نوار دکمه‌های سریع';
        subtitle = 'کلیدهای تعاملی هدایت کاربران';
        break;
      case 'faqs':
        title = 'سوالات متداول رزمندگان';
        subtitle = 'پاسخ به پرسش‌های عمومی';
        break;
      case 'about_section':
        title = 'درباره ما و اهداف قرارگاه';
        subtitle = 'معرفی ستاد مرکزی';
        break;
      case 'social_messengers':
        title = 'شبکه‌های اجتماعی و تماس';
        subtitle = 'لینک پیام‌رسان‌های ایرانی';
        break;
      default:
        title = 'بخش سفارشی';
    }

    const newBlock: HomePageBlock = {
      id: `blk-${Date.now()}`,
      type,
      title,
      subtitle,
      isVisible: true,
      order: maxOrder + 1,
      content: type === 'custom_banner' ? 'متن فراخوان ویژه را اینجا وارد کنید...' : undefined,
      buttonText: type === 'custom_banner' ? 'ورود به مسابقه' : undefined,
      buttonTab: type === 'custom_banner' ? 'register' : undefined
    };

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setActiveSidebarTab('inspector');
    showToast(`ویجت «${title}» اضافه شد`);
  };

  const handleSaveAndPublish = () => {
    const updatedSettings: SiteSettings = {
      ...localSettings,
      homeBlocks: blocks
    };
    onSaveSiteSettings(updatedSettings);
    showToast('تمامی تغییرات و چیدمان جدید با موفقیت در صفحه اصلی ذخیره و منتشر شد!');
  };

  const handleResetToDefault = () => {
    confirmInternal('آیا از بازنشانی چیدمان به حالت اولیه مطمئن هستید؟', {
      title: 'بازنشانی چیدمان',
      onConfirm: () => {
        setBlocks(JSON.parse(JSON.stringify(defaultHomeBlocks)));
        showToast('چیدمان به حالت پیش‌فرض المنتور بازگشت');
      }
    });
  };

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  // Helper to render individual blocks in Canvas Preview
  const renderCanvasBlockContent = (block: HomePageBlock) => {
    switch (block.type) {
      case 'hero':
        return (
          <AdventureHeroSection 
            themeMode="boys"
            currentUser={currentUser}
            siteSettings={localSettings}
            onOpenRegister={() => {}}
            onGoToDashboard={() => {}}
            onNavigate={onNavigateToTab}
          />
        );

      case 'action_buttons':
        return (
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
            <span className="text-xs font-bold text-slate-400 block">نوار کلیدهای تعاملی و دسترسی‌های سریع (تنظیم شده در سامانه مدیریت محتوا)</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(localSettings.homeButtons || []).filter(b => b.isActive).map(btn => (
                <span key={btn.id} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold rounded-xl shadow">
                  {btn.text}
                </span>
              ))}
            </div>
          </div>
        );

      case 'video_player':
        return (
          <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-black text-cyan-300">
              <Video size={18} />
              <span>{block.title || 'ویدئوی اختصاصی قرارگاه'}</span>
            </div>
            {block.subtitle && <p className="text-[11px] text-slate-400">{block.subtitle}</p>}
            <div className="aspect-video w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-black border border-slate-800 relative flex items-center justify-center">
              {(block.videoUrl || localSettings.heroVideoUrl) ? (
                <video src={block.videoUrl || localSettings.heroVideoUrl} controls className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Play size={40} className="text-cyan-400 animate-pulse" />
                  <span className="text-xs">ویدئوی قرارگاه بارگذاری شده است (برای تغییر لینک به پنل ویرایش بروید)</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'stats_strip':
        return <StatsStrip stats={homeStats} />;

      case 'prizes_awards':
        return (
          <PrizesAwardsBanner 
            themeMode="boys"
            onExplorePrizes={() => {}}
          />
        );

      case 'announcements':
        return (
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-amber-400 border-b border-slate-800 pb-2">
              <Sparkles size={16} />
              <span>{block.title || 'اطلاعیه‌ها و اخبار قرارگاه'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {homeAnnouncements.slice(0, 4).map(ann => (
                <div key={ann.id} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-cyan-400 block">{ann.createdAt}</span>
                  <p className="font-bold text-white text-xs mt-0.5">{ann.title}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'about_section':
        return (
          <AboutSection 
            onOpenMore={() => {}}
          />
        );

      case 'faqs':
        return (
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-cyan-400 border-b border-slate-800 pb-2">
              <HelpCircle size={16} />
              <span>{block.title || 'سوالات متداول رزمندگان'}</span>
            </div>
            <div className="space-y-2 text-xs">
              {faqs.slice(0, 3).map(faq => (
                <div key={faq.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <p className="font-bold text-amber-300">{faq.question}</p>
                  <p className="text-slate-300 text-[11px] mt-1">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'social_messengers':
        return (
          <SocialMessengersWidgets 
            themeMode="boys"
            triggerAlert={() => {}}
          />
        );

      case 'custom_banner':
        return (
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border border-cyan-500/50 p-6 rounded-2xl text-center space-y-3 shadow-xl">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-[10px] font-bold rounded-full border border-cyan-500/40 inline-block">
              {block.badgeText || 'فراخوان سفارشی'}
            </span>
            <h3 className="text-lg font-black text-white">{block.title}</h3>
            {block.subtitle && <p className="text-xs text-slate-300 max-w-lg mx-auto">{block.subtitle}</p>}
            {block.content && <p className="text-xs text-slate-200 leading-relaxed max-w-xl mx-auto">{block.content}</p>}
            {block.buttonText && (
              <button type="button" className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs rounded-xl shadow-lg transition hover:scale-105">
                {block.buttonText}
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      
      {/* TOP ELEMENTOR STUDIO HEADER TOOLBAR */}
      <div className="h-14 bg-[#090e24] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-xl">
        
        {/* Left Brand & Editor Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md">
            <Layout size={20} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <span>طراح و چیدمان دیداری صفحه اصلی</span>
              <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 text-[10px] font-bold border border-cyan-800 rounded-full">
                نسخه پیشرفته
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">چیدمان، ویجت‌ها و متون صفحه اول سایت را زنده بپچینید</p>
          </div>
        </div>

        {/* Center Viewport Responsive Device Selector */}
        <div className="hidden md:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              deviceMode === 'desktop' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor size={14} />
            <span>دسکتاپ</span>
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              deviceMode === 'tablet' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet size={14} />
            <span>تبلت</span>
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              deviceMode === 'mobile' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>موبایل</span>
          </button>
        </div>

        {/* Right Actions: Save, Reset & Exit */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefault}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1"
            title="بازنشانی چیدمان"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">بازنشانی</span>
          </button>

          <button
            onClick={handleSaveAndPublish}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={16} />
            <span>انتشار و ذخیره تغییرات</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl transition"
            title="خروج از محیط المنتور"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* MAIN EDITOR LAYOUT: SIDEBAR PANEL + LIVE CANVAS AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT ELEMENTOR SIDEBAR PANEL (340px) */}
        <div className="w-80 sm:w-96 bg-[#090d21] border-l border-slate-800 flex flex-col shrink-0 z-20 shadow-2xl">
          
          {/* Sidebar Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950/80 text-xs font-bold">
            <button
              onClick={() => setActiveSidebarTab('blocks')}
              className={`flex-1 py-3 border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'blocks' 
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layout size={15} />
              <span>بخش‌ها ({blocks.length})</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab('widgets')}
              className={`flex-1 py-3 border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'widgets' 
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus size={15} />
              <span>کتابخانه ویجت</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab('inspector')}
              className={`flex-1 py-3 border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'inspector' 
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal size={15} />
              <span>ویرایشگر محتوا</span>
            </button>
          </div>

          {/* Sidebar Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            
            {/* TAB 1: BLOCKS LAYOUT LIST & RE-ORDER */}
            {activeSidebarTab === 'blocks' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span>ترتیب بخش‌های فعال صفحه اول:</span>
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                    برای تغییر اولویت روی فلش‌ها بزنید
                  </span>
                </div>

                <div className="space-y-2">
                  {sortedBlocks.map((blk, idx) => {
                    const isSelected = selectedBlockId === blk.id;
                    const isFirst = idx === 0;
                    const isLast = idx === sortedBlocks.length - 1;

                    return (
                      <div
                        key={blk.id}
                        onClick={() => setSelectedBlockId(blk.id)}
                        className={`p-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected 
                            ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500' 
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-black text-cyan-400 flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="font-extrabold truncate">{blk.title}</p>
                            <p className="text-[10px] text-slate-400 truncate">{blk.type}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleVisibility(blk.id)}
                            className={`p-1 rounded transition ${blk.isVisible ? 'text-emerald-400 hover:bg-emerald-950' : 'text-slate-600 hover:bg-slate-800'}`}
                            title={blk.isVisible ? 'مخفی کردن بخش' : 'نمایش بخش'}
                          >
                            {blk.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            disabled={isFirst}
                            onClick={() => handleMoveUp(blk.id)}
                            className={`p-1 rounded transition ${isFirst ? 'text-slate-700' : 'text-cyan-400 hover:bg-slate-800'}`}
                            title="انتقال به بالا"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            disabled={isLast}
                            onClick={() => handleMoveDown(blk.id)}
                            className={`p-1 rounded transition ${isLast ? 'text-slate-700' : 'text-cyan-400 hover:bg-slate-800'}`}
                            title="انتقال به پایین"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteBlock(blk.id)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-950 transition"
                            title="حذف بخش"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: WIDGET LIBRARY */}
            {activeSidebarTab === 'widgets' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">روی هر ویجت کلیک کنید تا به صفحه اضافه شود:</p>
                <div className="grid grid-cols-1 gap-2.5">
                  
                  <button
                    onClick={() => handleAddWidget('custom_banner')}
                    className="p-3 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500 rounded-xl text-right transition group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">بنر پیام سفارشی و فراخوان</h4>
                      <p className="text-[10px] text-slate-400">ایجاد باکس ویژه با دکمه اقدام مستقیم</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAddWidget('video_player')}
                    className="p-3 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500 rounded-xl text-right transition group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      <Video size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">پخش‌کننده ویدئوی اختصاصی</h4>
                      <p className="text-[10px] text-slate-400">نمایش تیزر و گزارش‌های ویدیویی</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAddWidget('prizes_awards')}
                    className="p-3 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500 rounded-xl text-right transition group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Trophy size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">بخش جوایز و کریستال‌ها</h4>
                      <p className="text-[10px] text-slate-400">نمایش کنسول، تبلت و جوایز نفیس</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAddWidget('stats_strip')}
                    className="p-3 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500 rounded-xl text-right transition group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <BarChart2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">آمار زنده و دستاوردها</h4>
                      <p className="text-[10px] text-slate-400">شمارنده تعداد کاربران و مأموریت‌ها</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAddWidget('faqs')}
                    className="p-3 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500 rounded-xl text-right transition group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <HelpCircle size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">پرسش‌های متداول</h4>
                      <p className="text-[10px] text-slate-400">پاسخ به ابهامات رایج کاربران</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAddWidget('social_messengers')}
                    className="p-3 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500 rounded-xl text-right transition group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">پیام‌رسان‌ها و ارتباط</h4>
                      <p className="text-[10px] text-slate-400">کانال‌های بله، ایتا و شبکه‌های اجتماعی</p>
                    </div>
                  </button>

                </div>
              </div>
            )}

            {/* TAB 3: CONTENT INSPECTOR */}
            {activeSidebarTab === 'inspector' && (
              <div className="space-y-4 text-xs">
                {selectedBlock ? (
                  <div className="space-y-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-black text-cyan-300">{selectedBlock.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{selectedBlock.id}</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">عنوان بخش:</label>
                      <input
                        type="text"
                        value={selectedBlock.title || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, title: val } : b));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block">توضیح یا زیرعنوان:</label>
                      <input
                        type="text"
                        value={selectedBlock.subtitle || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, subtitle: val } : b));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>

                    {selectedBlock.type === 'custom_banner' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 block">متن کامل پیام:</label>
                          <textarea
                            rows={3}
                            value={selectedBlock.content || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, content: val } : b));
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:border-cyan-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 block">متن دکمه اقدام:</label>
                          <input
                            type="text"
                            value={selectedBlock.buttonText || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, buttonText: val } : b));
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:border-cyan-500 outline-none"
                          />
                        </div>
                      </>
                    )}

                    {selectedBlock.type === 'video_player' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 block">نشانی اینترنتی مستقیم ویدیو:</label>
                        <input
                          type="text"
                          value={selectedBlock.videoUrl || localSettings.heroVideoUrl || ''}
                          placeholder="https://.../video.mp4"
                          onChange={(e) => {
                            const val = e.target.value;
                            setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, videoUrl: val } : b));
                            setLocalSettings(prev => ({ ...prev, heroVideoUrl: val }));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-[10px] dir-ltr focus:border-cyan-500 outline-none"
                        />
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                      <span className="text-slate-400">وضعیت انتشار:</span>
                      <button
                        onClick={() => handleToggleVisibility(selectedBlock.id)}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] ${
                          selectedBlock.isVisible ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {selectedBlock.isVisible ? 'فعال و نمایان' : 'مخفی شده'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-6">یک بخش را از لیست انتخاب کنید تا ویرایشگر باز شود.</p>
                )}
              </div>
            )}

          </div>
        </div>

        {/* RIGHT LIVE CANVAS PREVIEW AREA */}
        <div className="flex-1 bg-slate-950 overflow-y-auto p-4 sm:p-6 flex flex-col items-center custom-scrollbar">
          
          {/* Toast Notification Alert Banner inside Canvas */}
          {toastMessage && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[10000] bg-cyan-500 text-slate-950 px-5 py-2 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 animate-bounce">
              <Sparkles size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Device Frame Simulation Container */}
          <div className={`transition-all duration-300 w-full space-y-6 ${
            deviceMode === 'tablet' 
              ? 'max-w-[768px] border-8 border-slate-800 rounded-3xl p-4 bg-[#030712] shadow-2xl my-4' 
              : deviceMode === 'mobile' 
                ? 'max-w-[390px] border-8 border-slate-800 rounded-[36px] p-3 bg-[#030712] shadow-2xl my-4' 
                : 'max-w-5xl'
          }`}>
            
            {/* Render Canvas Blocks in Order */}
            {sortedBlocks.map((block, idx) => {
              if (!block.isVisible) return null;
              const isSelected = selectedBlockId === block.id;

              return (
                <div
                  key={block.id}
                  onClick={() => {
                    setSelectedBlockId(block.id);
                    setActiveSidebarTab('inspector');
                  }}
                  className={`relative group rounded-2xl transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-cyan-950/10 p-2' 
                      : 'hover:ring-1 hover:ring-cyan-500/50 p-1'
                  }`}
                >
                  {/* Elementor Hover Control Badge Toolbar */}
                  <div className={`absolute -top-3.5 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black shadow-lg transition-all ${
                    isSelected 
                      ? 'bg-cyan-500 text-slate-950 scale-100' 
                      : 'bg-slate-900/90 text-cyan-400 border border-slate-700 opacity-0 group-hover:opacity-100'
                  }`}>
                    <SlidersHorizontal size={12} />
                    <span>ویجت: {block.title}</span>

                    <div className="flex items-center gap-1 border-r border-slate-800 pr-1.5 mr-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleMoveUp(block.id)}
                        className="p-0.5 hover:text-white"
                        title="جابه‌جایی به بالا"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => handleMoveDown(block.id)}
                        className="p-0.5 hover:text-white"
                        title="جابه‌جایی به پایین"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-0.5 hover:text-rose-300"
                        title="حذف ویجت"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Render Actual Component */}
                  {renderCanvasBlockContent(block)}
                </div>
              );
            })}

          </div>

        </div>

      </div>

    </div>
  );
}
