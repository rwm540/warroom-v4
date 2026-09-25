import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  X, 
  Zap,
  Sparkles
} from 'lucide-react';
import { User, GamePortal } from '../types';
import { getGamePortals } from '../data/portalData';

// Official in-project character avatar assets
import womanCommanderAvatar from '../assets/images/avatar/woman/Commander_giving_orders_2K_202608210108.jpeg';
import womanTacticalAvatar from '../assets/images/avatar/woman/Tactical_commander_character_design_2K_202608210119.jpeg';
import womanVictoryAvatar from '../assets/images/avatar/woman/Female_commander_in_victory_pose_202608210116.jpeg';

import maleCommanderAvatar from '../assets/images/avatar/male/Commander_in_tactical_uniform_ready_202608210056.jpeg';
import maleTacticalAvatar from '../assets/images/avatar/male/Commander_wearing_tactical_uniform_2K_202608210049.jpeg';
import maleVictoryAvatar from '../assets/images/avatar/male/Commander_doing_victory_pose_2K_202608210056.jpeg';

interface GameSelectionPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectWarRoom: (game?: GamePortal) => void;
  campaignTheme?: 'girls' | 'boys';
  portals?: GamePortal[];
  isMandatory?: boolean;
}

export default function GameSelectionPortalModal({
  isOpen,
  onClose,
  currentUser,
  onSelectWarRoom,
  campaignTheme = 'boys',
  portals: customPortals,
  isMandatory = false
}: GameSelectionPortalModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isGirls = campaignTheme === 'girls' || currentUser?.gender === 'دختر';

  // Dynamic portals based on Admin settings / Supabase / localStorage
  const sourcePortals = (customPortals && customPortals.length > 0) ? customPortals : getGamePortals();
  
  // Filter portals by active status and audience target
  const portalsList = sourcePortals.filter(portal => {
    if (portal.status === 'disabled') return false;
    if (portal.targetAudience === 'girls' && !isGirls) return false;
    if (portal.targetAudience === 'boys' && isGirls) return false;
    return true;
  });

  // Pick commander avatar asset based on theme and index/game
  const primaryAvatar = currentUser?.avatar_url || (isGirls ? womanCommanderAvatar : maleCommanderAvatar);
  
  const getPortalAvatar = (index: number) => {
    if (isGirls) {
      const avatars = [womanCommanderAvatar, womanTacticalAvatar, womanVictoryAvatar];
      return avatars[index % avatars.length];
    } else {
      const avatars = [maleCommanderAvatar, maleTacticalAvatar, maleVictoryAvatar];
      return avatars[index % avatars.length];
    }
  };

  const handleLaunchGame = (game: GamePortal) => {
    if (game.status !== 'active') return;
    if (game.link && game.link.startsWith('http')) {
      window.open(game.link, '_blank');
      onClose();
    } else {
      onSelectWarRoom(game);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 dir-rtl font-sans select-none">
        
        {/* Backdrop overlay with blur - non-dismissible when mandatory */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isMandatory ? undefined : onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border p-4 sm:p-7 shadow-2xl z-10 custom-scrollbar ${
            isGirls
              ? 'bg-gradient-to-b from-[#1a0228] via-[#0f0119] to-[#050009] border-fuchsia-500/40 shadow-[0_0_60px_rgba(255,19,137,0.3)]'
              : 'bg-gradient-to-b from-[#081026] via-[#040816] to-[#01030a] border-blue-500/40 shadow-[0_0_60px_rgba(37,99,235,0.3)]'
          }`}
        >
          {/* Top Decorative Ambient Glow */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 blur-[80px] rounded-full pointer-events-none ${
            isGirls ? 'bg-[#ff1389]/25' : 'bg-[#2563eb]/25'
          }`} />

          {/* Close / Dismiss Button - REMOVED during registration / mandatory mode */}
          {!isMandatory && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition z-20 cursor-pointer"
              title="بستن پنجره"
            >
              <X size={20} />
            </button>
          )}

          {/* Modal Header */}
          <div className="text-center space-y-2 pb-5 border-b border-slate-800/80 relative z-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              انتخاب سامانه و مأموریت عملیاتی
            </h2>

            {currentUser && (
              <div className="pt-1 flex items-center justify-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-amber-400 shadow-md shrink-0">
                  <img
                    src={primaryAvatar}
                    alt={currentUser.first_name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium flex items-center gap-1.5">
                  <span>رزمنده:</span>
                  <span className="text-amber-300 font-bold">{currentUser.first_name} {currentUser.last_name}</span>
                  {currentUser.role === 'admin' && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/40">
                      مدیر کل
                    </span>
                  )}
                </div>
              </div>
            )}

            {isMandatory && (
              <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Zap size={14} className="text-amber-400 animate-pulse shrink-0" />
                <span>لطفاً برای شروع و ورود به پنل، درگاه بازی مورد نظر خود را انتخاب کنید.</span>
              </div>
            )}
          </div>

          {/* Games Selection Grid - Fully dynamic based on Admin Panel Portals */}
          <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 relative z-10">
            {portalsList.map((game, index) => {
              const isActive = game.status === 'active';
              const cardAvatar = getPortalAvatar(index);
              const badgeClass = game.badgeColor || (isActive 
                ? (isGirls ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50')
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40');

              return (
                <div
                  key={game.id}
                  className={`group relative rounded-3xl p-5 border flex flex-col justify-between transition-all duration-300 ${
                    isActive
                      ? isGirls
                        ? 'bg-gradient-to-b from-[#2e053f]/90 via-[#190226]/95 to-[#0a0012] border-fuchsia-400 shadow-[0_0_35px_rgba(255,19,137,0.4)] hover:border-pink-300 hover:shadow-[0_0_45px_rgba(255,19,137,0.6)] cursor-pointer'
                        : 'bg-gradient-to-b from-[#0e1e42]/90 via-[#071128]/95 to-[#020512] border-blue-400 shadow-[0_0_35px_rgba(37,99,235,0.4)] hover:border-blue-300 hover:shadow-[0_0_45px_rgba(37,99,235,0.6)] cursor-pointer'
                      : 'bg-[#080d1e]/50 border-slate-800/80 opacity-75 grayscale-[0.3]'
                  }`}
                  onClick={() => handleLaunchGame(game)}
                >
                  {/* Active Game Highlighting Border Glow */}
                  {isActive && (
                    <div className={`absolute inset-0 rounded-3xl pointer-events-none transition duration-500 border-2 ${
                      isGirls ? 'border-pink-500/40 group-hover:border-pink-400' : 'border-blue-500/40 group-hover:border-blue-400'
                    }`} />
                  )}

                  <div className="space-y-4">
                    
                    {/* Card Header: Avatar Character Thumbnail & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className={`w-13 h-13 rounded-2xl overflow-hidden border-2 shadow-lg shrink-0 ${
                        isActive
                          ? isGirls 
                            ? 'border-pink-400 shadow-[0_0_20px_rgba(255,19,137,0.6)] ring-2 ring-pink-500/30' 
                            : 'border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.6)] ring-2 ring-blue-500/30'
                          : 'border-slate-700 opacity-60'
                      }`}>
                        <img 
                          src={cardAvatar} 
                          alt={game.title} 
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${badgeClass}`}>
                        {game.badgeText || (isActive ? 'فعال • در حال برگزاری' : 'به‌زودی')}
                      </span>
                    </div>

                    {/* Titles */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg font-black text-white">
                          {game.title}
                        </h3>
                        {isActive && (
                          <CheckCircle2 size={16} className={isGirls ? 'text-pink-400' : 'text-blue-400'} />
                        )}
                      </div>
                      {game.subtitle && (
                        <p className="text-[11px] text-amber-300/90 font-medium mt-0.5">
                          {game.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    {game.description && (
                      <p className="text-xs text-slate-300 leading-relaxed text-right">
                        {game.description}
                      </p>
                    )}

                  </div>

                  {/* Action Button */}
                  <div className="pt-5 mt-auto">
                    {isActive ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchGame(game);
                        }}
                        className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm text-white border shadow-xl flex items-center justify-center gap-2 transition transform group-hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                          isGirls
                            ? 'girls-button-neon border-pink-300/60 shadow-[0_0_25px_rgba(255,19,137,0.7)]'
                            : 'boys-button-tactical border-blue-300/60 shadow-[0_0_25px_rgba(37,99,235,0.7)]'
                        }`}
                      >
                        <Zap size={16} className="animate-pulse" />
                        <span>ورود به سامانه {game.title}</span>
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <div className="w-full py-2.5 px-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed">
                        <Lock size={14} />
                        <span>غیرفعال • به‌زودی</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
