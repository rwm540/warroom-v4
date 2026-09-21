import React from 'react';
import { User } from '../../types';
import { Shield, LogIn, UserPlus, LogOut, Home, Headphones, Info, Gamepad2, User as UserIcon, Heart, Zap, Sparkles } from 'lucide-react';
const WARROOM_LOGO_PATH = '/images/logos/warroom_logo_sm.webp';

interface TopHeaderProps {
  currentUser: User | null;
  activeAnnouncementsCount: number;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onToggleNotifications: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  campaignTheme?: 'girls' | 'boys';
  onChangeCampaign?: () => void;
  onToggleTheme?: (mode: 'girls' | 'boys') => void;
}

export default function TopHeader({
  currentUser,
  activeAnnouncementsCount,
  activeTab = 'Home',
  setActiveTab,
  onToggleNotifications,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onOpenProfile,
  campaignTheme = 'boys'
}: TopHeaderProps) {
  const isGirls = campaignTheme === 'girls';
  const navItems = [
    { id: 'Home', label: 'صفحه اصلی', icon: Home },
    { id: 'Support', label: 'ارتباط با ما', icon: Headphones },
    { id: 'About', label: 'درباره ما', icon: Info },
  ];

  return (
    <header className={`sticky top-0 z-30 w-full backdrop-blur-md border-b px-2 sm:px-4 py-2 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.6)] dir-rtl ${
      isGirls 
        ? 'bg-gradient-to-r from-[#170222]/95 via-[#080010]/95 to-[#1c0328]/95 border-fuchsia-500/30' 
        : 'bg-gradient-to-r from-[#0d162e]/95 via-[#030713]/95 to-[#1c0915]/95 border-blue-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.8),0_0_20px_rgba(37,99,235,0.2)]'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Right Section: Brand Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl border shadow-md ${
            isGirls
              ? 'bg-[#180126]/90 border-fuchsia-500/50 shadow-[0_0_15px_rgba(255,19,137,0.4)]'
              : 'bg-[#060c20]/90 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.4),0_0_15px_rgba(220,38,38,0.25)]'
          }`}>
            <img 
              src={WARROOM_LOGO_PATH} 
              alt="اتاق جنگ" 
              width={48}
              height={48}
              loading="eager"
              decoding="async"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-white/40 shrink-0 shadow-lg" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </div>

        {/* Center Section: User Info Pill */}
        <div className="flex items-center justify-center min-w-0 flex-1 px-1">
          {/* User Badge / Profile */}
          {currentUser && (
            <button 
              onClick={onOpenProfile}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-xl transition shadow-md border ${
                isGirls
                  ? 'bg-[#1a0429] hover:bg-[#25063b] border-fuchsia-500/40 text-fuchsia-200 shadow-[0_0_10px_rgba(255,19,137,0.2)]'
                  : 'bg-[#081129] hover:bg-[#0e1d44] border-blue-500/40 text-blue-200 shadow-[0_0_10px_rgba(37,99,235,0.25)]'
              }`}
              title="شناسنامه و کد اختصاصی رزمنده"
            >
              {/* Personal Code (Hidden on Mobile) */}
              <div className="hidden sm:flex px-1.5 py-0.5 rounded-md bg-red-950/90 border border-red-500/60 text-red-400 font-mono font-black text-xs shrink-0 tracking-wider">
                {currentUser.personal_code || '۷۴۸۹۷۰۳۴'}
              </div>

              {/* Name & Icon */}
              <div className="flex items-center gap-1 min-w-0">
                <UserIcon size={14} className={isGirls ? 'text-fuchsia-400 shrink-0' : 'text-blue-400 shrink-0'} />
                <span className="text-[11px] sm:text-xs font-black text-slate-100 truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                  {currentUser.first_name} {currentUser.last_name}
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Left Section: Auth Actions */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Auth State */}
          {!currentUser ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenLogin}
                className={`px-2 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
                  isGirls 
                    ? 'text-pink-200 bg-[#160224] hover:bg-[#24043b] border-fuchsia-500/40' 
                    : 'text-blue-100 bg-[#070f26] hover:bg-[#0d1a40] border-blue-500/40'
                }`}
                title="ورود به سامانه"
              >
                <LogIn size={13} className={isGirls ? 'text-fuchsia-400' : 'text-blue-400'} />
                <span className="text-[11px]">ورود</span>
              </button>
              <button
                onClick={onOpenRegister}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black text-white transition flex items-center gap-1 shadow-lg ${
                  isGirls
                    ? 'girls-button-neon border border-pink-300/40'
                    : 'boys-button-tactical border border-blue-300/40'
                }`}
                title="ثبت‌نام جدید"
              >
                <UserPlus size={13} />
                <span className="text-[11px]">ثبت‌نام</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="p-1.5 sm:p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 transition focus:outline-none shrink-0"
              title="خروج از حساب کاربری"
              aria-label="خروج"
            >
              <LogOut size={16} />
            </button>
          )}

        </div>

      </div>
    </header>
  );
}

