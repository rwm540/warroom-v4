import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Gamepad2, 
  User as UserIcon, 
  Copy, 
  Check, 
  LogOut, 
  Users, 
  SlidersHorizontal, 
  Bell, 
  LayoutDashboard, 
  Target, 
  BookOpen, 
  Home, 
  MoreHorizontal, 
  X, 
  Headphones, 
  Info, 
  Award, 
  ChevronLeft, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  Radio, 
  Trophy,
  Gift,
  Grid,
  WalletCards,
  MessageCircle
} from 'lucide-react';
import { User } from '../types';
import { formatToPersianDigits } from '../utils/jalali';

interface NavbarProps {
  currentUser: User | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  onOpenSquadModal: () => void;
  onOpenNotifications?: () => void;
  onOpenGamePortal?: () => void;
  unreadNotificationsCount?: number;
  isAdminView: boolean;
  setIsAdminView: (val: boolean) => void;
  unreadTicketsCount?: number;
  campaignTheme?: 'girls' | 'boys';
}

export default function Navbar({
  currentUser,
  currentTab,
  setCurrentTab,
  onLogout,
  onOpenSquadModal,
  onOpenNotifications,
  onOpenGamePortal,
  unreadNotificationsCount = 0,
  isAdminView,
  setIsAdminView,
  unreadTicketsCount = 0,
  campaignTheme = 'boys'
}: NavbarProps) {
  const [copied, setCopied] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const isGirls = campaignTheme === 'girls' || currentUser?.gender === 'دختر';

  const copyPersonalCode = () => {
    if (currentUser?.personal_code) {
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
        console.warn('Clipboard copy fallback:', err);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'مدیریت کل ستاد';
      case 'leader':
        return 'فرمانده ارشد جوخه';
      case 'member':
        return 'عضو جوخه عملیاتی';
      case 'user':
      default:
        return 'رزمنده انفرادی جنگ';
    }
  };

  const handleSelectTab = (tab: string, isAdmin = false, isNotif = false) => {
    if (isNotif && onOpenNotifications) {
      setIsMobileMoreOpen(false);
      onOpenNotifications();
      return;
    }
    if (tab === 'Chat') {
      setIsMobileMoreOpen(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('warroom_open_chat_modal'));
      }
      return;
    }
    setIsAdminView(isAdmin);
    setCurrentTab(tab);
    setIsMobileMoreOpen(false);
  };

  // Full Desktop Navigation items (Web desktop/laptop) - Dashboard is exclusive to Admin
  const desktopNavItems: { id: string; label: string; icon: any; badge?: string }[] = [
    { id: 'Journey', label: 'نقشه مراحل بازی', icon: Gamepad2 },
    { id: 'Rewards', label: 'جوایز و امتیازات', icon: Gift },
    { id: 'Vitrin', label: 'ویترین و آثار', icon: Grid },
    { id: 'Chat', label: 'چت روم عملیاتی', icon: MessageCircle },
    ...(currentUser?.role === 'admin' ? [] : [{ id: 'Wallet', label: 'تراکنش‌ها و پرداختی‌ها', icon: WalletCards }]),
  ];

  // Android Mobile Bottom Navigation (Core 3 tabs)
  const mobileBottomItems = [
    { id: 'Journey', label: 'نقشه بازی', icon: Gamepad2 },
    { id: 'Rewards', label: 'جوایز و امتیازات', icon: Gift },
    { id: 'Vitrin', label: 'ویترین و آثار', icon: Grid },
  ];

  // Items shown inside the Mobile Android Bottom Sheet (More ...)
  const mobileSheetItems = [
    {
      id: 'Chat',
      label: 'چت روم جوخه',
      desc: 'گفت‌وگو با اعضای جوخه و نیروهای زیرمجموعه',
      icon: MessageCircle,
    },
    { 
      id: 'Notifications', 
      label: 'مرکز پیام‌ها و اعلانات ستاد', 
      desc: 'مشاهده دستورالعمل‌های عملیاتی، اخطارهای فوری و نشان‌ها',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? `${formatToPersianDigits(unreadNotificationsCount)} جدید` : undefined,
      isNotification: true
    },
    ...(currentUser?.role === 'admin' ? [
      { 
        id: 'Admin', 
        label: 'پنل ارزیابی و مدیریت ستاد', 
        desc: 'داوری مأموریت‌ها، مدیریت کاربران، جوخه‌ها و اخبار',
        icon: SlidersHorizontal, 
        isAdmin: true,
        badge: 'مدیر کل' 
      }
    ] : []),
    { 
      id: 'Support', 
      label: 'پشتیبانی و تیکت‌های پاسخ‌گویی', 
      desc: 'ارتباط مستقیم با مرکز پشتیبانی فنی و داوری',
      icon: Headphones,
      badge: unreadTicketsCount > 0 ? `${formatToPersianDigits(unreadTicketsCount)} تیکت` : undefined
    },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (DESKTOP & MOBILE TOP BAR)                                  */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-transparent border-none shadow-none dir-rtl font-sans transition-colors duration-500">
        
        {/* Top Utility Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between text-xs">
          
          {/* Brand Logo & Title */}
          <div 
  className="flex items-center gap-2.5 sm:gap-3 shrink-0 group select-none transition-transform hover:scale-[1.02]"
>
  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden">
    <img
      src="/images/logos/warroom_logo_sm.webp"
      alt="لوگوی سامانه اتاق جنگ"
      width={36}
      height={36}
      loading="eager"
      decoding="async"
      className="w-full h-full object-contain"
    />
  </div>

  <div>
    <div className="flex items-center gap-1.5">
      <h1 className="font-black text-xs sm:text-sm md:text-base text-white tracking-tight">
        اتاق جنگ
      </h1>
    </div>

    <p className="text-[10px] text-slate-400 font-medium hidden md:block">
      سامانه ارزیابی، مسابقه و آموزش‌های استراتژیک دانش‌آموزی
    </p>
  </div>
</div>

          {/* Actions Bar: User Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* User Controls / Status */}
            {currentUser && (
              <>
                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-2 bg-slate-900/90 hover:bg-red-950/80 border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-300 rounded-xl transition cursor-pointer flex items-center justify-center"
                  title="خروج از سامانه"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP FULL NAVIGATION BAR (VISIBLE ONLY ON MD / DESKTOP SCREENS)         */}
        {/* ========================================================================= */}
        {currentUser && (
          <div className="hidden md:block max-w-7xl mx-auto px-4 py-2">
            <nav className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {desktopNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id && !isAdminView;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id, false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 border cursor-pointer ${
                        isActive
                          ? isGirls
                            ? 'girls-button-neon text-white border-pink-300/50 shadow-[0_0_15px_rgba(255,19,137,0.5)]'
                            : 'boys-button-tactical text-white border-blue-300/50 shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                          : isGirls
                            ? 'bg-[#180224]/70 text-slate-300 hover:text-white border-fuchsia-950/80 hover:border-fuchsia-500/40 hover:bg-[#250638]/80'
                            : 'bg-[#091126]/70 text-slate-300 hover:text-white border-blue-950/80 hover:border-blue-500/40 hover:bg-[#0e1d40]/80'
                      }`}
                    >
                      <Icon size={15} strokeWidth={1.8} className={isActive ? 'text-white' : isGirls ? 'text-fuchsia-400' : 'text-blue-400'} />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="bg-rose-500 text-white text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Desktop Admin Quick Access Button */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => handleSelectTab('Admin', true)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition border cursor-pointer ${
                    isAdminView
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                      : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/50'
                  }`}
                >
                  <SlidersHorizontal size={15} />
                  <span>داوری و مدیریت ستاد</span>
                </button>
              )}
              {currentUser.role !== 'admin' && (
                <button
                  onClick={onOpenSquadModal}
                  className="flex items-center gap-1.5 rounded-xl border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-xs font-black text-red-300 transition hover:bg-red-900/50 cursor-pointer"
                  title="تشکیل جوخه، مدیریت اعضا و ثبت نیرو"
                >
                  <Users size={15} />
                  <span>{currentUser.group_id ? 'مدیریت و ثبت نیروی جوخه' : 'تشکیل و مدیریت جوخه'}</span>
                </button>
              )}
              <button
                onClick={() => handleSelectTab('Chat')}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-800/60 bg-cyan-950/40 px-3 py-1.5 text-xs font-black text-cyan-300 transition hover:bg-cyan-900/50 cursor-pointer"
                title="باز کردن چت روم عملیاتی"
              >
                <MessageCircle size={15} />
                <span>چت روم</span>
              </button>
            </nav>
          </div>
        )}

      </header>

      {/* ========================================================================= */}
      {/* 3. ANDROID SLIDE-UP BOTTOM SHEET (OPENS ON MOBILE WHEN "سایر" IS CLICKED) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMobileMoreOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center dir-rtl md:hidden">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMoreOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            />

            {/* Android Slide-Up Sheet Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className={`relative z-10 w-full border-t border-x rounded-t-3xl p-5 pb-8 shadow-[0_-15px_50px_rgba(0,0,0,0.95)] max-h-[85vh] overflow-y-auto ${
                isGirls 
                  ? 'bg-[#14021e] border-fuchsia-500/40' 
                  : 'bg-[#060c20] border-blue-500/40 shadow-[0_-15px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(37,99,235,0.2)]'
              }`}
            >
              
              {/* Android Top Handle Bar */}
              <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileMoreOpen(false)} />

              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                    isGirls ? 'bg-fuchsia-950 border-fuchsia-500/40 text-fuchsia-400' : 'bg-blue-950 border-blue-500/40 text-blue-400'
                  }`}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">منوی دسترسی و بخش‌های تکمیلی</h3>
                    <p className="text-[10px] text-slate-400">اتاق جنگ استراتژیک نوجوانان</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Sheet Extended Items */}
              <div className="space-y-2">
                {mobileSheetItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.isAdmin 
                    ? isAdminView 
                    : currentTab === item.id && !isAdminView;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id, !!item.isAdmin, !!item.isNotification)}
                      className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-right ${
                        isActive
                          ? isGirls
                            ? 'bg-gradient-to-r from-fuchsia-950/90 to-purple-950 border-fuchsia-500/60 shadow-[0_0_15px_rgba(255,19,137,0.3)] text-white'
                            : 'bg-gradient-to-r from-blue-950/90 to-slate-900 border-blue-500/60 shadow-[0_0_15px_rgba(37,99,235,0.3)] text-white'
                          : isGirls
                            ? 'bg-[#180224]/80 hover:bg-[#260538] border-fuchsia-950/80 text-slate-300'
                            : 'bg-[#060e24] hover:bg-slate-900/90 border-blue-950/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                          isActive
                            ? isGirls
                              ? 'bg-fuchsia-500/25 text-fuchsia-300 border-fuchsia-500/50'
                              : 'bg-blue-500/25 text-blue-300 border-blue-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          <Icon size={18} strokeWidth={1.6} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{item.label}</span>
                            {item.badge && (
                              <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.desc}</p>
                        </div>
                      </div>

                      <ChevronLeft size={16} className="text-slate-500 shrink-0" />
                    </button>
                  );
                })}

                {/* Leader Squad Management Tile inside Sheet */}
                {currentUser?.role === 'leader' && (
                  <button
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      onOpenSquadModal();
                    }}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-red-950/80 to-slate-900 border border-red-700/60 hover:border-red-500 transition-all flex items-center justify-between text-right mt-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-900/40 text-red-300 border border-red-700/60 flex items-center justify-center shrink-0">
                        <Users size={18} strokeWidth={1.6} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-red-200 block">مدیریت و اصلاح اعضای جوخه</span>
                        <p className="text-[10px] text-red-400/80">تغییر اعضا، بازبینی مشخصات و مدیریت دسترسی جوخه</p>
                      </div>
                    </div>
                    <ChevronLeft size={16} className="text-red-400 shrink-0" />
                  </button>
                )}
              </div>

              {/* Bottom Quick Logout */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px]">کاربر: <strong className="text-white">{currentUser?.first_name} {currentUser?.last_name}</strong></span>
                <button
                  onClick={() => {
                    setIsMobileMoreOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 font-bold bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-800/40 transition"
                >
                  <LogOut size={14} />
                  <span>خروج از حساب</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
