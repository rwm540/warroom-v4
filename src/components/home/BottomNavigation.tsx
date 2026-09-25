import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Gamepad2, 
  Gift, 
  Grid,
  SlidersHorizontal,
  MessageCircle,
  WalletCards,
  MoreHorizontal,
  X
} from 'lucide-react';
import { User } from '../../types';
import { prefetchViewChunk } from '../../App';

export interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: User | null;
  isAdminMode?: boolean;
  setIsAdminMode?: (val: boolean) => void;
  campaignTheme?: 'girls' | 'boys';
}

export default function BottomNavigation({
  activeTab,
  setActiveTab,
  currentUser,
  isAdminMode,
  setIsAdminMode,
  campaignTheme
}: BottomNavigationProps) {
  const isGirls = campaignTheme === 'girls' || currentUser?.gender === 'دختر';
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    // Warm up chunks for instant navigation without loading delays
    prefetchViewChunk('Journey');
    prefetchViewChunk('Rewards');
    prefetchViewChunk('Vitrin');
  }, []);

  const primaryItems = [
    { id: 'Journey', label: 'نقشه بازی', icon: Gamepad2, isAdmin: false },
    { id: 'Rewards', label: 'جوایز', icon: Gift, isAdmin: false },
    { id: 'Vitrin', label: 'ویترین', icon: Grid, isAdmin: false },
  ];

  const secondaryItems = [
    { id: 'Chat', label: 'چت روم', icon: MessageCircle },
    ...(currentUser?.role === 'admin' ? [] : [{ id: 'Wallet', label: 'رسیدها و پرداختی‌ها', icon: WalletCards }]),
    ...(currentUser?.role === 'admin' ? [{ id: 'Admin', label: 'ستاد', icon: SlidersHorizontal }] : [])
  ];

  const handleSelectTab = (item: { id: string; isAdmin?: boolean }) => {
    setIsMoreOpen(false);
    if (item.isAdmin || item.id === 'Admin') {
      if (setIsAdminMode) {
        setIsAdminMode(true);
      }
      setActiveTab('Admin');
    } else {
      if (setIsAdminMode) {
        setIsAdminMode(false);
      }
      setActiveTab(item.id);
    }
  };

  return (
    <nav 
      aria-label="منوی اندروید"
      className={`fixed bottom-3.5 inset-x-2.5 sm:bottom-5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[480px] z-40 rounded-[28px] backdrop-blur-2xl border shadow-[0_12px_45px_rgba(0,0,0,0.85)] dir-rtl px-1.5 sm:px-2 py-1.5 transition-all duration-300 select-none md:hidden ${
        isGirls 
          ? 'bg-gradient-to-r from-[#180323]/95 via-[#0c0114]/95 to-[#1c0429]/95 border-fuchsia-500/40 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(255,19,137,0.3)]'
          : 'bg-gradient-to-r from-[#060c22]/95 via-[#0a1538]/95 to-[#160614]/95 border-blue-500/40 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(37,99,235,0.35),0_0_12px_rgba(220,38,38,0.2)]'
      }`}
      id="android-bottom-navigation"
    >
      {isMoreOpen && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          className="absolute bottom-[calc(100%+10px)] left-1/2 z-50 grid w-[min(92vw,340px)] -translate-x-1/2 grid-cols-2 gap-2 rounded-2xl border border-cyan-500/30 bg-[#071126]/95 p-3 shadow-[0_0_35px_rgba(34,211,238,0.25)] backdrop-blur-xl"
        >
          {secondaryItems.map(item => {
            const Icon = item.icon;
            const active = item.id === 'Admin' ? Boolean(isAdminMode || activeTab === 'Admin') : activeTab === item.id && !isAdminMode;
            return (
              <motion.button 
                type="button" 
                key={item.id} 
                whileTap={{ scale: 0.9 }} 
                onClick={() => handleSelectTab(item)} 
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-bold ${active ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200' : 'border-slate-700 bg-slate-900/80 text-slate-300'}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
          <button type="button" onClick={() => setIsMoreOpen(false)} className="col-span-2 flex items-center justify-center gap-1 rounded-xl border border-slate-700 py-1.5 text-[10px] text-slate-400">
            <X size={14} /> بستن
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-4 items-center justify-items-center relative gap-0.5">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'Rewards'
            ? (!isAdminMode && (activeTab === 'Rewards' || activeTab === 'Prizes' || activeTab === 'RewardsLeaderboard' || activeTab === 'Leaderboard'))
            : activeTab === item.id && !isAdminMode;

          return (
            <motion.button
              type="button"
              key={item.id}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleSelectTab(item)}
              onMouseEnter={() => prefetchViewChunk(item.id)}
              onTouchStart={() => prefetchViewChunk(item.id)}
              aria-label={item.label}
              title={item.label}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all w-full select-none cursor-pointer focus:outline-none ${
                isActive
                  ? item.isAdmin 
                    ? 'text-amber-300 font-black'
                    : isGirls ? 'text-fuchsia-300 font-black' : 'text-blue-300 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Animated Sliding Highlight Pill */}
              {isActive && (
                <motion.div
                  layoutId="android-active-pill"
                  transition={{ type: "spring", stiffness: 460, damping: 33 }}
                  className={`absolute inset-0 rounded-2xl border shadow-md ${
                    item.isAdmin
                      ? 'bg-amber-500/25 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : isGirls
                        ? 'bg-gradient-to-b from-[#ff1389]/30 to-[#7c3aed]/20 border-fuchsia-400/50 shadow-[0_0_15px_rgba(255,19,137,0.4)]'
                        : 'bg-gradient-to-b from-blue-600/30 via-blue-500/20 to-red-600/20 border-blue-400/50 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                  }`}
                />
              )}

              <div className="relative z-10 flex flex-col items-center justify-center w-full">
                <motion.div
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.3 : 1.7} 
                    className={
                      isActive 
                        ? item.isAdmin
                          ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.85)]'
                          : isGirls
                            ? 'text-pink-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.85)]'
                            : 'text-blue-300 drop-shadow-[0_0_8px_rgba(37,99,235,0.85)]'
                        : 'text-slate-400'
                    }
                  />
                </motion.div>
                
                <span className={`text-[9.5px] sm:text-[10px] font-bold mt-1 tracking-tight truncate max-w-full text-center transition-colors ${
                  isActive 
                    ? item.isAdmin
                      ? 'text-amber-300 font-black'
                      : isGirls ? 'text-pink-300 font-black' : 'text-blue-300 font-black'
                    : 'text-slate-400'
                }`}>
                  {item.label}
                </span>

                {/* Active Tiny Glowing Indicator Dot */}
                {isActive && (
                  <motion.span 
                    layoutId="android-active-dot"
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      item.isAdmin
                        ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                        : isGirls 
                          ? 'bg-pink-400 shadow-[0_0_6px_#f43f5e]'
                          : 'bg-blue-400 shadow-[0_0_6px_#3b82f6]'
                    }`}
                  />
                )}
              </div>
            </motion.button>
          );
        })}
        <motion.button 
          type="button" 
          whileTap={{ scale: 0.88 }} 
          onClick={() => setIsMoreOpen(value => !value)} 
          aria-label="بیشتر" 
          title="بیشتر" 
          className={`relative flex w-full flex-col items-center justify-center rounded-2xl py-1.5 text-[9.5px] font-bold cursor-pointer transition-colors ${isMoreOpen ? 'text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <MoreHorizontal size={20} />
          <span className="mt-1">بیشتر</span>
        </motion.button>
      </div>
    </nav>
  );
}
